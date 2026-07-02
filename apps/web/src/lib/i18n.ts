import i18n from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';

import ukSharing from '../locales/uk/sharing.json';
import enActions from '../locales/en/actions.json';
import enAuth from '../locales/en/auth.json';
import enCommon from '../locales/en/common.json';
import enErrors from '../locales/en/errors.json';
import enSharing from '../locales/en/sharing.json';
import ukActions from '../locales/uk/actions.json';
import ukAuth from '../locales/uk/auth.json';
import ukCommon from '../locales/uk/common.json';
import ukErrors from '../locales/uk/errors.json';

export const defaultNS = 'common';
export const resources = {
  en: {
    common: enCommon,
    actions: enActions,
    errors: enErrors,
    auth: enAuth,
    sharing: enSharing,
  },
  uk: {
    common: ukCommon,
    actions: ukActions,
    errors: ukErrors,
    auth: ukAuth,
    sharing: ukSharing,
  },
} as const;

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    defaultNS,
    fallbackLng: 'en',
    supportedLngs: ['en', 'uk'],
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    },
  });

export default i18n;
