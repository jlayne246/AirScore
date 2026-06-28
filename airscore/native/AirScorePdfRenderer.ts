import { NativeModules, Platform } from "react-native";

type RenderPageOptions = {
  pdfPath: string;
  page: number;
  width: number;
  height: number;
};

type RenderPageResult = {
  uri: string;
  width: number;
  height: number;
  page: number;
  totalPages: number;
};

type AirScorePdfRendererModule = {
  getPageCount(pdfPath: string): Promise<number>;
  renderPage(options: RenderPageOptions): Promise<RenderPageResult>;
  clearDocumentCache(pdfPath: string): Promise<boolean>;
};

const getNativeModule = (): AirScorePdfRendererModule => {
  const nativeModule =
    NativeModules.AirScorePdfRenderer as AirScorePdfRendererModule | undefined;

  if (Platform.OS !== "android" || !nativeModule) {
    throw new Error(
      "AirScorePdfRenderer is only available in the Android native build."
    );
  }

  return nativeModule;
};

export default {
  getPageCount(pdfPath: string): Promise<number> {
    return getNativeModule().getPageCount(pdfPath);
  },

  renderPage(options: RenderPageOptions): Promise<RenderPageResult> {
    return getNativeModule().renderPage(options);
  },

  clearDocumentCache(pdfPath: string): Promise<boolean> {
    return getNativeModule().clearDocumentCache(pdfPath);
  },
};