import { useTranslation } from "react-i18next";
import { openExternalUrl } from "../platform/fs";
import { APP_NAME, APP_VERSION, GITHUB_URL, WEB_APP_URL } from "./meta";

type Props = {
  onClose: () => void;
};

export function AboutDialog({ onClose }: Props) {
  const { t } = useTranslation();

  const openLink = (url: string) => {
    void openExternalUrl(url).catch(() => {
      window.alert(url);
    });
  };

  return (
    <div className="mdyar-modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="mdyar-modal mdyar-about-modal"
        role="dialog"
        aria-labelledby="about-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="mdyar-modal-header">
          <h2 id="about-title">{t("about.title")}</h2>
          <button
            type="button"
            className="mdyar-icon-btn"
            onClick={onClose}
            aria-label={t("dialogs.cancel")}
          >
            ×
          </button>
        </header>

        <div className="mdyar-about-body">
          <img
            className="mdyar-about-mark"
            src={`${import.meta.env.BASE_URL}mdyar.svg`}
            alt=""
            width={48}
            height={48}
          />
          <p className="mdyar-about-name">
            {APP_NAME}{" "}
            <span className="mdyar-about-version">v{APP_VERSION}</span>
          </p>
          <p className="mdyar-about-tagline">{t("app.tagline")}</p>
          <p className="mdyar-about-license">{t("about.license")}</p>

          <div className="mdyar-about-actions">
            <button
              type="button"
              className="mdyar-btn"
              onClick={() => openLink(GITHUB_URL)}
            >
              {t("about.github")}
            </button>
            <button
              type="button"
              className="mdyar-btn"
              onClick={() => openLink(WEB_APP_URL)}
            >
              {t("about.website")}
            </button>
          </div>

          <p className="mdyar-about-url">
            <a
              href={GITHUB_URL}
              onClick={(e) => {
                e.preventDefault();
                openLink(GITHUB_URL);
              }}
            >
              {GITHUB_URL}
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
