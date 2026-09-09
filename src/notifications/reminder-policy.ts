import { supabase } from "@/lib/supabase";
import { loadSettings } from "@/storage/settings-store";

// 서버 알림 빈도와 휴식 설정 저장
export async function syncReminderPolicy(token: string): Promise<void> {
  if (!supabase) return;
  const settings = await loadSettings();
  const { error } = await supabase.rpc("save_reminder_policy", {
    p_token: token,
    p_limit: settings.reminderDailyLimit,
    p_quiet: settings.reminderQuietHour,
    p_pause: settings.reminderPausedDate || null,
  });
  if (error) throw error;
}
