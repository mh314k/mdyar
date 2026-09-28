/** Single source for app identity shown in the UI and window title. */
export const APP_VERSION = __APP_VERSION__;
export const APP_NAME = "MDyar";
export const GITHUB_URL = "https://github.com/mh314k/mdyar";
export const WEB_APP_URL = "https://mh314k.github.io/mdyar/";

export function appWindowTitle(): string {
  return `${APP_NAME} ${APP_VERSION}`;
}
