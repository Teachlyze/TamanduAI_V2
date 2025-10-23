// supabase/functions/cache-warmup/index.ts
// POST { cache_keys: string[], user_id?, metadata? }
// Warms up cache for frequently accessed data

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Common cache patterns that should be warmed up
const CACHE_PATTERNS = {
  user_profile: "profile:{user_id}",
  class_data: "class:{class_id}",
  activity_data: "activity:{activity_id}",
  notifications: "notifications:{user_id}:{timestamp}",
  class_activities: "class_activities:{class_id}",
  class_members: "class_members:{class_id}",
  student_submissions: "student_submissions:{student_id}",
  teacher_classes: "teacher_classes:{teacher_id}",
};

async function warmupUserProfile(admin: any, userId: string) {
  try {
    const { data: profile } = await admin
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    return profile;
  } catch (error) {
    console.warn(`Failed to warmup profile for user ${userId}:`, error);
    return null;
  }
}

async function warmupClassData(admin: any, classId: string) {
  try {
    const { data: classData } = await admin
      .from("classes")
      .select(`
        *,
        members:class_members(*, user:profiles(*)),
        activities(*)
      `)
      .eq("id", classId)
      .single();

    return classData;
  } catch (error) {
    console.warn(`Failed to warmup class data for ${classId}:`, error);
    return null;
  }
}

async function warmupActivityData(admin: any, activityId: string) {
  try {
    const { data: activity } = await admin
      .from("activities")
      .select(`
        *,
        class:classes(id, name),
        submissions(*, user:profiles(full_name))
      `)
      .eq("id", activityId)
      .single();

    return activity;
  } catch (error) {
    console.warn(`Failed to warmup activity data for ${activityId}:`, error);
    return null;
  }
}

async function warmupNotifications(admin: any, userId: string) {
  try {
    const { data: notifications } = await admin
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20);

    return notifications;
  } catch (error) {
    console.warn(`Failed to warmup notifications for user ${userId}:`, error);
    return null;
  }
}

async function warmupClassActivities(admin: any, classId: string) {
  try {
    const { data: activities } = await admin
      .from("activities")
      .select("*")
      .eq("class_id", classId)
      .order("created_at", { ascending: false });

    return activities;
  } catch (error) {
    console.warn(`Failed to warmup class activities for ${classId}:`, error);
    return null;
  }
}

async function warmupClassMembers(admin: any, classId: string) {
  try {
    const { data: members } = await admin
      .from("class_members")
      .select("*, user:profiles(*)")
      .eq("class_id", classId);

    return members;
  } catch (error) {
    console.warn(`Failed to warmup class members for ${classId}:`, error);
    return null;
  }
}

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const body = await req.json();
    const {
      cache_keys = [],
      user_id,
      metadata = {}
    } = body;

    if (cache_keys.length === 0 && !user_id) {
      return new Response(JSON.stringify({
        error: "Either cache_keys or user_id is required"
      }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Get real client IP
    const clientIP = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
                     req.headers.get("x-real-ip") ||
                     req.headers.get("cf-connecting-ip") ||
                     "unknown";

    const warmupResults = [];
    const errors = [];

    // If user_id provided, warmup common user-related data
    if (user_id) {
      const userWarmupTasks = [
        { name: "user_profile", task: () => warmupUserProfile(admin, user_id) },
        { name: "user_notifications", task: () => warmupNotifications(admin, user_id) },
        { name: "user_classes", task: async () => {
          const { data: classes } = await admin
            .from("class_members")
            .select("class_id")
            .eq("user_id", user_id);

          if (classes && classes.length > 0) {
            const classIds = classes.map(c => c.class_id);
            return Promise.all(classIds.map(id => warmupClassData(admin, id)));
          }
          return [];
        }},
      ];

      for (const task of userWarmupTasks) {
        try {
          const result = await task.task();
          warmupResults.push({
            cache_key: task.name,
            success: true,
            data: result,
          });
        } catch (error) {
          errors.push({
            cache_key: task.name,
            error: error.message,
          });
        }
      }
    }

    // Warmup specific cache keys
    for (const cacheKey of cache_keys) {
      try {
        let result = null;

        // Parse cache key to determine what to warmup
        if (cacheKey.startsWith("profile:")) {
          const userId = cacheKey.split(":")[1];
          result = await warmupUserProfile(admin, userId);
        } else if (cacheKey.startsWith("class:")) {
          const classId = cacheKey.split(":")[1];
          result = await warmupClassData(admin, classId);
        } else if (cacheKey.startsWith("activity:")) {
          const activityId = cacheKey.split(":")[1];
          result = await warmupActivityData(admin, activityId);
        } else if (cacheKey.startsWith("notifications:")) {
          const parts = cacheKey.split(":");
          const userId = parts[1];
          result = await warmupNotifications(admin, userId);
        } else if (cacheKey.startsWith("class_activities:")) {
          const classId = cacheKey.split(":")[1];
          result = await warmupClassActivities(admin, classId);
        } else if (cacheKey.startsWith("class_members:")) {
          const classId = cacheKey.split(":")[1];
          result = await warmupClassMembers(admin, classId);
        }

        warmupResults.push({
          cache_key: cacheKey,
          success: result !== null,
          data: result,
        });

      } catch (error) {
        errors.push({
          cache_key: cacheKey,
          error: error.message,
        });
      }
    }

    // Log warmup operation
    await admin.from("cache_warmup_log").insert([
      {
        client_ip: clientIP,
        user_id,
        cache_keys_warmed: cache_keys.length,
        total_operations: warmupResults.length,
        successful_operations: warmupResults.filter(r => r.success).length,
        failed_operations: errors.length,
        metadata: {
          warmup_results: warmupResults,
          errors: errors,
          ...metadata,
        },
        created_at: new Date().toISOString(),
      },
    ]);

    return new Response(JSON.stringify({
      success: errors.length === 0,
      total_operations: warmupResults.length,
      successful_operations: warmupResults.filter(r => r.success).length,
      failed_operations: errors.length,
      warmup_results: warmupResults,
      errors: errors.length > 0 ? errors : undefined,
      executed_at: new Date().toISOString(),
    }), {
      status: errors.length === 0 ? 200 : 207, // 207 = Multi-Status
      headers: { "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("cache-warmup error:", error);
    return new Response(JSON.stringify({
      error: "Internal server error",
      message: error.message,
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
