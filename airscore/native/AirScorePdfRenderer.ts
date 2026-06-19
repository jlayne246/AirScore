import { NativeModules } from 'react-native';

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

const { AirScorePdfRenderer } = NativeModules;

if (!AirScorePdfRenderer) {
  throw new Error('AirScorePdfRenderer native module is not registered.');
}

export default {
  getPageCount(pdfPath: string): Promise<number> {
    return AirScorePdfRenderer.getPageCount(pdfPath);
  },

  renderPage(options: RenderPageOptions): Promise<RenderPageResult> {
    return AirScorePdfRenderer.renderPage(options);
  },

  clearDocumentCache(pdfPath: string): Promise<boolean> {
    return AirScorePdfRenderer.clearDocumentCache(pdfPath);
  },
};
