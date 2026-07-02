import { Button } from '@vaultly/ui';
import { Languages } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export function LanguageSwitcher() {
  const { i18n } = useTranslation();

  const toggleLanguage = () => {
    const next = i18n.language === 'uk' ? 'en' : 'uk';
    void i18n.changeLanguage(next);
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggleLanguage}
      className="gap-1.5 font-medium"
      aria-label="Switch language"
    >
      <Languages className="h-4 w-4" />
      {i18n.language === 'uk' ? 'EN' : 'УК'}
    </Button>
  );
}
