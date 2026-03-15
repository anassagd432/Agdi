"use client";
import React, { createContext, useContext, useState, useCallback, useMemo, type ReactNode } from "react";

export type Locale = "en" | "fr" | "ar" | "es";

const translations: Record<Locale, Record<string, string>> = {
  en: {
    "nav.overview": "Overview", "nav.agents": "Agents", "nav.console": "Console",
    "nav.browser": "Browser", "nav.canvas": "Canvas", "nav.channels": "Channels",
    "nav.workflows": "Workflows", "nav.nodes": "Nodes", "nav.skills": "Skills",
    "nav.traces": "Traces", "nav.knowledge": "Knowledge", "nav.analytics": "Analytics",
    "nav.approvals": "Approvals", "nav.security": "Security", "nav.settings": "Settings",
    "action.save": "Save", "action.cancel": "Cancel", "action.delete": "Delete",
    "action.create": "Create", "action.refresh": "Refresh", "action.export": "Export",
    "action.signout": "Sign Out", "action.search": "Search",
    "status.connected": "Connected", "status.disconnected": "Disconnected",
    "status.running": "Running", "status.idle": "Idle", "status.stopped": "Stopped",
  },
  fr: {
    "nav.overview": "Aperçu", "nav.agents": "Agents", "nav.console": "Console",
    "nav.browser": "Navigateur", "nav.canvas": "Canvas", "nav.channels": "Canaux",
    "nav.workflows": "Flux de travail", "nav.nodes": "Nœuds", "nav.skills": "Compétences",
    "nav.traces": "Traces", "nav.knowledge": "Connaissances", "nav.analytics": "Analytique",
    "nav.approvals": "Approbations", "nav.security": "Sécurité", "nav.settings": "Paramètres",
    "action.save": "Enregistrer", "action.cancel": "Annuler", "action.delete": "Supprimer",
    "action.create": "Créer", "action.refresh": "Actualiser", "action.export": "Exporter",
    "action.signout": "Déconnexion", "action.search": "Rechercher",
    "status.connected": "Connecté", "status.disconnected": "Déconnecté",
    "status.running": "En cours", "status.idle": "Inactif", "status.stopped": "Arrêté",
  },
  ar: {
    "nav.overview": "نظرة عامة", "nav.agents": "الوكلاء", "nav.console": "وحدة التحكم",
    "nav.browser": "المتصفح", "nav.canvas": "اللوحة", "nav.channels": "القنوات",
    "nav.workflows": "سير العمل", "nav.nodes": "العقد", "nav.skills": "المهارات",
    "nav.traces": "التتبع", "nav.knowledge": "المعرفة", "nav.analytics": "التحليلات",
    "nav.approvals": "الموافقات", "nav.security": "الأمان", "nav.settings": "الإعدادات",
    "action.save": "حفظ", "action.cancel": "إلغاء", "action.delete": "حذف",
    "action.create": "إنشاء", "action.refresh": "تحديث", "action.export": "تصدير",
    "action.signout": "تسجيل الخروج", "action.search": "بحث",
    "status.connected": "متصل", "status.disconnected": "غير متصل",
    "status.running": "قيد التشغيل", "status.idle": "خامل", "status.stopped": "متوقف",
  },
  es: {
    "nav.overview": "Resumen", "nav.agents": "Agentes", "nav.console": "Consola",
    "nav.browser": "Navegador", "nav.canvas": "Lienzo", "nav.channels": "Canales",
    "nav.workflows": "Flujos", "nav.nodes": "Nodos", "nav.skills": "Habilidades",
    "nav.traces": "Trazas", "nav.knowledge": "Conocimiento", "nav.analytics": "Analítica",
    "nav.approvals": "Aprobaciones", "nav.security": "Seguridad", "nav.settings": "Configuración",
    "action.save": "Guardar", "action.cancel": "Cancelar", "action.delete": "Eliminar",
    "action.create": "Crear", "action.refresh": "Actualizar", "action.export": "Exportar",
    "action.signout": "Cerrar sesión", "action.search": "Buscar",
    "status.connected": "Conectado", "status.disconnected": "Desconectado",
    "status.running": "Ejecutando", "status.idle": "Inactivo", "status.stopped": "Detenido",
  },
};

interface I18nContextType {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: string) => string;
}

const I18nContext = createContext<I18nContextType>({
  locale: "en",
  setLocale: () => {},
  t: (key) => key,
});

export function useI18n() { return useContext(I18nContext); }

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en");

  useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("agdi-locale") as Locale | null;
      if (saved && translations[saved]) setLocaleState(saved);
    }
  });

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    if (typeof window !== "undefined") localStorage.setItem("agdi-locale", l);
    // Set direction for RTL languages
    document.documentElement.dir = l === "ar" ? "rtl" : "ltr";
  }, []);

  const t = useCallback(
    (key: string) => translations[locale]?.[key] || translations.en[key] || key,
    [locale],
  );

  const value = useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export const LOCALES: { value: Locale; label: string; flag: string }[] = [
  { value: "en", label: "English", flag: "🇺🇸" },
  { value: "fr", label: "Français", flag: "🇫🇷" },
  { value: "ar", label: "العربية", flag: "🇸🇦" },
  { value: "es", label: "Español", flag: "🇪🇸" },
];
