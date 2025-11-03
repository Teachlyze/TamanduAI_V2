import { logger } from '@/shared/utils/logger';
import { supabase } from '@/lib/supabaseClient';
import NotificationOrchestrator from '@/services/notificationOrchestrator';
import EmailTemplateService from '@/services/emailTemplateService';

class ClassInviteService {
  // Generate a new invite for a class
  static async createInvite(classId, options = {}) {
    const { 
      maxUses = 10, 
      expiresInHours = 24 * 7, 
      recipientEmail, 
      role = 'student',
      invitationType = recipientEmail ? 'email' : 'link'
    } = options; // Default 1 week, student role
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Authorization: owner or teacher member of the class
    const [{ data: cls }, { data: teacherMember }] = await Promise.all([
      supabase.from('classes').select('id, created_by, name, description').eq('id', classId).single(),
      supabase
        .from('class_members')
        .select('id')
        .eq('class_id', classId)
        .eq('user_id', user.id)
        .eq('role', 'teacher')
        .maybeSingle(),
    ]);

    if (!cls || (cls.created_by !== user.id && !teacherMember)) {
      throw new Error('Unauthorized: Only class owner/teacher can create invites');
    }

    // Generate expiration date
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + expiresInHours);

    // Generate invitation code
    const invitationCode = this.generateInvitationCode();

    // Create the invite
    const { data: invite, error } = await supabase
      .from('class_invitations')
      .insert([
        {
          class_id: classId,
          created_by: user.id,
          invitation_code: invitationCode,
          invitation_type: invitationType,
          target_email: recipientEmail || null,
          role,
          max_uses: maxUses,
          current_uses: 0,
          expires_at: expiresAt.toISOString(),
          status: 'active'
        }
      ])
      .select()
      .single();

    if (error) throw error;
    try {
      // Send email if recipientEmail is provided
      if (recipientEmail) {
        // Fetch class name and teacher info
        const { data: cls } = await supabase
          .from('classes')
          .select('name, created_by')
          .eq('id', classId)
          .single();

        const { data: teacher } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', cls?.created_by)
          .single();

        const acceptUrl = `${window?.location?.origin || ''}/join/${invite.invitation_code}`;

        // Use new email template system
        await EmailTemplateService.sendClassInvite({
          to: recipientEmail,
          className: cls?.name || 'Turma',
          teacherName: teacher?.full_name || 'Professor',
          acceptUrl,
          language: 'pt'
        });
      }
    } catch (e) {
      logger.warn('Falha ao enviar email de convite:', e)
    }
    return invite;
  }

  // Get all invites for a class (v2)
  static async getInvitesByClass(classId) {
    const { data, error } = await supabase
      .from('class_invitations')
      .select('*')
      .eq('class_id', classId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  // Revoke an invite
  static async revokeInvite(inviteId) {
    const { error } = await supabase
      .from('class_invitations')
      .update({ status: 'cancelled' })
      .eq('id', inviteId);

    if (error) throw error;
    return true;
  }

  // Get invite details by code (for preview before accepting)
  static async getInviteDetails(invitationCode) {
    const { data: invite, error: inviteError } = await supabase
      .from('class_invitations')
      .select(`
        *,
        class:classes (
          id,
          name,
          description,
          created_by,
          teacher:profiles!created_by (
            id,
            full_name,
            avatar_url
          )
        )
      `)
      .eq('invitation_code', invitationCode)
      .single();

    if (inviteError) throw new Error('Invalid invitation code');

    // validity checks
    if (invite.status !== 'active') throw new Error('Invitation is no longer active');
    if (new Date(invite.expires_at) < new Date()) throw new Error('Invitation has expired');
    if (invite.max_uses != null && invite.current_uses >= invite.max_uses) {
      throw new Error('Invitation has reached maximum uses');
    }

    return invite;
  }

  // Accept an invite code to join a class
  static async acceptInvite(invitationCode, userId, reqMeta = {}) {
    // Get the invite details
    const invite = await this.getInviteDetails(invitationCode);

    // Check if user is already in the class
    const { data: existingMember } = await supabase
      .from('class_members')
      .select('id')
      .eq('class_id', invite.class_id)
      .eq('user_id', userId)
      .maybeSingle();

    if (existingMember) {
      return { success: true, alreadyMember: true, classId: invite.class_id };
    }

    // Add user to class with role from invite
    const { error: enrollError } = await supabase
      .from('class_members')
      .insert([
        {
          class_id: invite.class_id,
          user_id: userId,
          role: invite.role || 'student',
          invited_by: invite.created_by,
          joined_at: new Date().toISOString(),
        }
      ]);

    if (enrollError) throw enrollError;

    // Record usage
    const { error: usageErr } = await supabase
      .from('invitation_usages')
      .insert([
        {
          invitation_id: invite.id,
          user_id: userId,
        }
      ]);
    if (usageErr) logger.warn('Failed to record invitation usage', usageErr)

    // Notify owner
    try {
      const { data: cls } = await supabase
        .from('classes')
        .select('id, name, created_by')
        .eq('id', invite.class_id)
        .single();

      const { data: studentProfile } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', userId)
        .single();

      const { data: teacherProfile } = await supabase
        .from('profiles')
        .select('email')
        .eq('id', cls?.created_by)
        .single();

      if (cls?.created_by && teacherProfile?.email) {
        // Send email to teacher
        await EmailTemplateService.sendClassInviteAccepted({
          to: teacherProfile.email,
          studentName: studentProfile?.full_name || 'Aluno',
          className: cls?.name || 'Turma',
          time: new Date().toLocaleString('pt-BR'),
          language: 'pt'
        });

        // Also send push notification
        await NotificationOrchestrator.send('classInviteAccepted', {
          userId: cls.created_by,
          variables: {
            studentName: studentProfile?.full_name || 'Aluno',
            className: cls?.name || 'Turma'
          },
          channelOverride: 'push',
          metadata: { classId: cls.id, inviteId: invite.id }
        });
      }
    } catch (e) {
      logger.warn('Falha ao notificar convite aceito:', e)
    }

    return { success: true };
  }

  // Generate a random invitation code (8 characters, easy to type)
  static generateInvitationCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclude similar looking characters
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  // Get invite link
  static getInviteLink(invitationCode) {
    const baseUrl = window?.location?.origin || 'https://tamanduai.com';
    return `${baseUrl}/join/${invitationCode}`;
  }
}

export default ClassInviteService;
