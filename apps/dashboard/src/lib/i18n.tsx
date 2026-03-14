"use client";

/**
 * Lightweight i18n system with JSON translation maps.
 * Supports EN (default), FR, AR, ES.
 */

import { createContext, useContext, useState, useCallback, useMemo, type ReactNode } from "react";

// ── Translation dictionaries ──────────────────────────────────────────────

const translations: Record<string, Record<string, string>> = {
  en: {
    "nav.overview": "Overview",
    "nav.agents": "Agents",
    "nav.console": "Console Log",
    "nav.browser": "Browser",
    "nav.canvas": "Canvas",
    "nav.channels": "Channels",
    "nav.automations": "Automations",
    "nav.nodes": "Nodes",
    "nav.skills": "Skills",
    "nav.traces": "Traces",
    "nav.knowledge": "Knowledge",
    "nav.analytics": "Analytics",
    "nav.approvals": "Approvals",
    "nav.workflows": "Workflows",
    "nav.security": "Security",
    "nav.settings": "Settings",
    "action.refresh": "Refresh",
    "action.export": "Export",
    "action.save": "Save",
    "action.cancel": "Cancel",
    "action.delete": "Delete",
    "action.create": "Create",
    "action.signout": "Sign Out",
    "status.active": "Active",
    "status.inactive": "Inactive",
    "status.connected": "Connected",
    "status.disconnected": "Disconnected",
    "theme.light": "Light",
    "theme.dark": "Dark",
    "theme.system": "System",
  },
  fr: {
    "nav.overview": "Aperçu",
    "nav.agents": "Agents",
    "nav.console": "Journal",
    "nav.browser": "Navigateur",
    "nav.canvas": "Canevas",
    "nav.channels": "Canaux",
    "nav.automations": "Automatisations",
    "nav.nodes": "Nœuds",
    "nav.skills": "Compétences",
    "nav.traces": "Traces",
    "nav.knowledge": "Connaissances",
    "nav.analytics": "Analytique",
    "nav.approvals": "Approbations",
    "nav.workflows": "Flux de travail",
    "nav.security": "Sécurité",
    "nav.settings": "Paramètres",
    "action.refresh": "Rafraîchir",
    "action.export": "Exporter",
    "action.save": "Enregistrer",
    "action.cancel": "Annuler",
    "action.delete": "Supprimer",
    "action.create": "Créer",
    "action.signout": "Déconnexion",
    "status.active": "Actif",
    "status.inactive": "Inactif",
    "status.connected": "Connecté",
    "status.disconnected": "Déconnecté",
    "theme.light": "Clair",
    "theme.dark": "Sombre",
    "theme.system": "Système",
  },
  ar: {
    "nav.overview": "نظرة عامة",
    "nav.agents": "الوكلاء",
    "nav.console": "سجل وحدة التحكم",
    "nav.browser": "المتصفح",
    "nav.canvas": "اللوحة",
    "nav.channels": "القنوات",
    "nav.automations": "الأتمتة",
    "nav.nodes": "العقد",
    "nav.skills": "المهارات",
    "nav.traces": "التتبع",
    "nav.knowledge": "المعرفة",
    "nav.analytics": "التحليلات",
    "nav.approvals": "الموافقات",
    "nav.workflows": "سير العمل",
    "nav.security": "الأمان",
    "nav.settings": "الإعدادات",
    "action.refresh": "تحديث",
    "action.export": "تصدير",
    "action.save": "حفظ",
    "action.cancel": "إلغاء",
    "action.delete": "حذف",
    "action.create": "إنشاء",
    "action.signout": "تسجيل الخروج",
    "status.active": "نشط",
    "status.inactive": "غير نشط",
    "status.connected": "متصل",
    "status.disconnected": "غير متصل",
    "theme.light": "فاتح",
    "theme.dark": "داكن",
    "theme.system": "النظام",
  },
  es: {
    "nav.overview": "Resumen",
    "nav.agents": "Agentes",
    "nav.console": "Consola",
    "nav.browser": "Navegador",
    "nav.canvas": "Lienzo",
    "nav.channels": "Canales",
    "nav.automations": "Automatizaciones",
    "nav.nodes": "Nodos",
    "nav.skills": "Habilidades",
    "nav.traces": "Trazas",
    "nav.knowledge": "Conocimiento",
    "nav.analytics": "Analítica",
    "nav.approvals": "Aprobaciones",
    "nav.workflows": "Flujos de trabajo",
    "nav.security": "Seguridad",
    "nav.settings": "Configuración",
    "action.refresh": "Actualizar",
    "action.export": "Exportar",
    "action.save": "Guardar",
    "action.cancel": "Cancelar",
    "action.delete": "Eliminar",
    "action.create": "Crear",
    "action.signout": "Cerrar sesión",
    "status.active": "Activo",
    "status.inactive": "Inactivo",
    "status.connected": "Conectado",
    "status.disconnected": "Desconectado",
    "theme.light": "Claro",
    "theme.dark": "Oscuro",
    "theme.system": "Sistema",
  },
};

export const SUPPORTED_LOCALES = [
  { code: "en", label: "English" },
  { code: "fr", label: "Français" },
  { code: "ar", label: "العربية" },
  { code: "es", label: "Español" },
] as const;

export type Locale = (typeof SUPPORTED_LOCALES)[number]["code"];

const I18N_KEY = "agdi-locale";

// ── Context ───────────────────────────────────────────────────────────────

interface I18nContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string) => string;
}

const I18nContext = createContext<I18nContextType>({
  locale: "en",
  setLocale: () => {},
  t: (key: string) => key,
});

export function useI18n() {
  return useContext(I18nContext);
}

// ── Provider ──────────────────────────────────────────────────────────────

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem(I18N_KEY) as Locale) || "en";
    }
    return "en";
  });

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    localStorage.setItem(I18N_KEY, newLocale);
    // Set dir for RTL support
    document.documentElement.dir = newLocale === "ar" ? "rtl" : "ltr";
  }, []);

  const t = useCallback(
    (key: string): string => {
      return translations[locale]?.[key] || translations.en[key] || key;
    },
    [locale],
  );

  const value = useMemo(
    () => ({ locale, setLocale, t }),
    [locale, setLocale, t],
  );

  return (
    <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
  );
}
