import { supabase } from '@/shared/services/supabaseClient';

export class UserService {
  /**
   * Buscar todos os usuários (profiles)
   * @returns {Promise<Array>} Lista de usuários
   */
  static async getUsers() {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erro ao buscar usuários:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Erro no UserService.getUsers:', error);
      throw new Error('Não foi possível carregar os usuários. Tente novamente.');
    }
  }

  /**
   * Buscar usuário por ID
   * @param {string} userId - ID do usuário
   * @returns {Promise<Object>} Dados do usuário
   */
  static async getUserById(userId) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Erro ao buscar usuário:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Erro no UserService.getUserById:', error);
      throw new Error('Não foi possível carregar o usuário. Tente novamente.');
    }
  }

  /**
   * Buscar usuários por tipo/role
   * @param {string} role - Tipo de usuário (teacher, student, etc.)
   * @returns {Promise<Array>} Lista de usuários filtrados
   */
  static async getUsersByRole(role) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', role)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erro ao buscar usuários por role:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Erro no UserService.getUsersByRole:', error);
      throw new Error('Não foi possível carregar os usuários. Tente novamente.');
    }
  }

  /**
   * Atualizar perfil do usuário
   * @param {string} userId - ID do usuário
   * @param {Object} updates - Dados para atualizar
   * @returns {Promise<Object>} Dados atualizados do usuário
   */
  static async updateUser(userId, updates) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', userId)
        .select('*')
        .single();

      if (error) {
        console.error('Erro ao atualizar usuário:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Erro no UserService.updateUser:', error);
      throw new Error('Não foi possível atualizar o usuário. Tente novamente.');
    }
  }

  /**
   * Buscar usuários com paginação
   * @param {Object} options - Opções de paginação e filtros
   * @returns {Promise<Object>} Dados paginados dos usuários
   */
  static async getUsersPaginated({ 
    page = 1, 
    limit = 10, 
    search = '', 
    role = null 
  } = {}) {
    try {
      let query = supabase
        .from('profiles')
        .select('*', { count: 'exact' });

      // Aplicar filtros
      if (search) {
        query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`);
      }

      if (role) {
        query = query.eq('role', role);
      }

      // Aplicar paginação
      const from = (page - 1) * limit;
      const to = from + limit - 1;

      const { data, error, count } = await query
        .range(from, to)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erro ao buscar usuários paginados:', error);
        throw error;
      }

      return {
        data: data || [],
        count: count || 0,
        page,
        limit,
        totalPages: Math.ceil((count || 0) / limit)
      };
    } catch (error) {
      console.error('Erro no UserService.getUsersPaginated:', error);
      throw new Error('Não foi possível carregar os usuários. Tente novamente.');
    }
  }
}

export default UserService;
