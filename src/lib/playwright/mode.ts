/**
 * @ref https://github.com/microsoft/playwright/blob/e32f3ea1432a865cf43aef966a6475b4919b3880/packages/recorder/src/recorderTypes.d.ts#L22~L31
 */
export type Mode =
  | "inspecting"
  | "recording"
  | "none"
  | "assertingText"
  | "recording-inspecting"
  | "standby"
  | "assertingVisibility"
  | "assertingValue"
  | "assertingSnapshot";

export const mode = <M extends Mode>(m: M): M => m;
