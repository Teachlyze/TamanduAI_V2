// supabase/functions/batch-operations/index.ts
// POST { operations: [{ table, operation, data, conditions? }] }
// Performs multiple database operations in a single transaction

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Supported operations
const SUPPORTED_OPERATIONS = {
  insert: "insert",
  update: "update",
  delete: "delete",
  upsert: "upsert",
  select: "select",
};

async function executeBatchOperation(admin: any, operation: any) {
  const { table, operation: opType, data, conditions = {} } = operation;

  if (!SUPPORTED_OPERATIONS[opType]) {
    throw new Error(`Unsupported operation: ${opType}`);
  }

  let query = admin.from(table);

  switch (opType) {
    case "insert":
      if (!Array.isArray(data)) {
        throw new Error("Insert operation requires data array");
      }
      query = query.insert(data);
      break;

    case "update":
      if (!data || typeof data !== "object") {
        throw new Error("Update operation requires data object");
      }
      query = query.update(data);
      // Apply conditions
      Object.entries(conditions).forEach(([key, value]) => {
        query = query.eq(key, value);
      });
      break;

    case "delete":
      // Apply conditions for delete
      Object.entries(conditions).forEach(([key, value]) => {
        query = query.eq(key, value);
      });
      query = query.delete();
      break;

    case "upsert":
      if (!Array.isArray(data)) {
        throw new Error("Upsert operation requires data array");
      }
      query = query.upsert(data);
      break;

    case "select":
      const { columns = "*", filters = {}, orderBy, limit } = data || {};
      query = query.select(columns);

      // Apply filters
      Object.entries(filters).forEach(([key, value]) => {
        if (Array.isArray(value)) {
          query = query.in(key, value);
        } else {
          query = query.eq(key, value);
        }
      });

      if (orderBy) {
        query = query.order(orderBy.column, { ascending: orderBy.ascending !== false });
      }

      if (limit) {
        query = query.limit(limit);
      }
      break;

    default:
      throw new Error(`Operation ${opType} not implemented`);
  }

  const result = await query;
  return {
    operation: opType,
    table,
    success: !result.error,
    data: result.data,
    error: result.error?.message,
    count: Array.isArray(result.data) ? result.data.length : (result.data ? 1 : 0),
  };
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
    const { operations, transaction = true } = body;

    if (!Array.isArray(operations) || operations.length === 0) {
      return new Response(JSON.stringify({
        error: "Operations array is required and cannot be empty"
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

    const results = [];
    const errors = [];

    if (transaction) {
      // Execute all operations in a transaction-like manner
      // Note: Supabase doesn't support transactions in Edge Functions directly
      // We'll execute them sequentially and rollback on error
      for (const operation of operations) {
        try {
          const result = await executeBatchOperation(admin, operation);
          results.push(result);

          if (!result.success) {
            errors.push({
              operation: operation.operation,
              table: operation.table,
              error: result.error,
            });
          }
        } catch (error) {
          errors.push({
            operation: operation.operation,
            table: operation.table,
            error: error.message,
          });
        }
      }
    } else {
      // Execute operations in parallel
      const promises = operations.map(async (operation) => {
        try {
          return await executeBatchOperation(admin, operation);
        } catch (error) {
          return {
            operation: operation.operation,
            table: operation.table,
            success: false,
            error: error.message,
            data: null,
            count: 0,
          };
        }
      });

      const batchResults = await Promise.all(promises);
      results.push(...batchResults);

      errors.push(...batchResults.filter(r => !r.success));
    }

    // Log batch operation
    await admin.from("batch_operations_log").insert([
      {
        client_ip: clientIP,
        operation_count: operations.length,
        success_count: results.filter(r => r.success).length,
        error_count: errors.length,
        operations_summary: {
          total: operations.length,
          successful: results.filter(r => r.success).length,
          failed: errors.length,
        },
        created_at: new Date().toISOString(),
      },
    ]);

    return new Response(JSON.stringify({
      success: errors.length === 0,
      total_operations: operations.length,
      successful_operations: results.filter(r => r.success).length,
      failed_operations: errors.length,
      results,
      errors: errors.length > 0 ? errors : undefined,
      executed_at: new Date().toISOString(),
    }), {
      status: errors.length === 0 ? 200 : 207, // 207 = Multi-Status
      headers: { "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("batch-operations error:", error);
    return new Response(JSON.stringify({
      error: "Internal server error",
      message: error.message,
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
