import type { SupabaseClientOptions } from "@supabase/supabase-js";
import ws from "ws";

type RealtimeOptions = Pick<SupabaseClientOptions<"public">, "realtime">;

export function getNodeRealtimeOptions(): RealtimeOptions {
  return {
    realtime: {
      transport: ws as unknown as NonNullable<
        RealtimeOptions["realtime"]
      >["transport"],
    },
  };
}
