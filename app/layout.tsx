import { ReactNode } from 'react';
import { Metadata } from 'next';
import { cn } from '@/lib/utils';
import { AuthProvider } from '@/providers/auth-provider';
import { I18nProvider } from '@/providers/i18n-provider';
import { ModulesProvider } from '@/providers/modules-provider';
import { QueryProvider } from '@/providers/query-provider';
import { SettingsProvider } from '@/providers/settings-provider';
import { ThemeProvider } from '@/providers/theme-provider';
import { TooltipsProvider } from '@/providers/tooltips-provider';
import { Toaster } from '@/components/ui/sonner';
import { AppShell } from './app-shell';

import '@/css/fonts.css';
import '@/css/styles.css';
import '@/components/keenicons/assets/styles.css';

// Server component: metadata cannot be exported from a client file.
//
// This is the Shell's root layout and its (protected) layout merged. A domain
// app has no public area — every route in it is behind the session — so the
// two-layer split the Shell needs does not apply here.
/**
 * ⛔ THE NAME IS IMPORTED, NEVER RETYPED.
 *
 * `systemName` is the Persian product name, and it contains a U+200C ZERO
 * WIDTH NON-JOINER between لایروب and ها. Reproducing those characters by hand
 * is how that character silently becomes a space — the identical hazard we
 * documented for the menu heading, where the customer's own bytes are kept
 * with their sha256 because two strings that render alike are not the same
 * string. Importing the JSON makes the question not arise.
 *
 * ⚠ IT CANNOT GO THROUGH t(), AND THAT IS NOT AN OVERSIGHT. This is a server
 * component and `useTranslation` is client-side, so `metadata` is resolved at
 * build time. The Persian is therefore FIXED here rather than following the
 * locale — correct today because the app runs `fa`, and the thing to change if
 * DMS ever needs an English tab title is this file, not the i18n call sites.
 */
import dmsFa from '@/i18n/dms/fa.json';

export const metadata: Metadata = {
  title: {
    /*
     * ⛔ IF YOU ADD A PAGE TITLE, IT COMES FROM i18n/dms/ — NEVER AN ENGLISH
     * LITERAL.
     *
     * The %s half is INERT TODAY: `export const metadata` appears exactly once
     * in this zone (this file), and none of the 26 page.tsx files sets its own,
     * so every route falls through to `default` and the tab reads the Persian
     * name everywhere. That is the intended result for a Persian-first product
     * whose customer asked for that name.
     *
     * Per-page titles are an obvious improvement and the rest of this app is
     * written in English, so the first person to add one produces:
     *
     *     "Daily Report | " + the Persian system name
     *
     * (That example deliberately does NOT reproduce the name. It would be a
     * second copy of a string whose defining character is invisible, and it
     * would go stale silently the day i18n/dms/fa.json changes — the comment
     * would still look right. One home for the string, including in prose.)
     *
     * Mixed script, in the browser tab — the first surface the customer sees,
     * before anything else has loaded.
     *
     * ⚠ AND THE TRAP IS THAT THE OBVIOUS FIX IS UNAVAILABLE. `metadata` is a
     * SERVER export, so `t()` cannot be called here — which is why this file
     * imports the JSON directly. An author who reaches for `t()`, finds it does
     * not work, and reaches for a literal instead has done nothing unreasonable.
     * That is the moment this comment exists to catch.
     *
     * Do NOT remove the template to avoid the problem: that prevents mixed
     * script by preventing branding, and the correct end state is a Persian page
     * title beside the Persian brand — which is what the template produces.
     */
    template: `%s | ${dmsFa.systemName}`,
    default: dmsFa.systemName,
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html className="h-full" suppressHydrationWarning>
      <body
        className={cn(
          'antialiased flex h-full text-base text-foreground bg-background font-vazirmatn',
        )}
      >
        <QueryProvider>
          <AuthProvider>
            <SettingsProvider>
              <ThemeProvider>
                <I18nProvider>
                  <TooltipsProvider>
                    <ModulesProvider>
                      <AppShell>{children}</AppShell>
                      <Toaster />
                    </ModulesProvider>
                  </TooltipsProvider>
                </I18nProvider>
              </ThemeProvider>
            </SettingsProvider>
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
