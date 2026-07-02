Implement it as an **iOS native module with the same API as your Android module**.

### 1. iOS Swift module shape

Create something like:

```swift
// ios/AirScorePdfRenderer.swift

import Foundation
import PDFKit
import UIKit

@objc(AirScorePdfRenderer)
class AirScorePdfRenderer: NSObject {

  @objc
  func getPageCount(
    _ pdfPath: String,
    resolver resolve: RCTPromiseResolveBlock,
    rejecter reject: RCTPromiseRejectBlock
  ) {
    guard let url = resolveUrl(pdfPath),
          let document = PDFDocument(url: url) else {
      reject("PAGE_COUNT_ERROR", "Unable to open PDF", nil)
      return
    }

    resolve(document.pageCount)
  }

  @objc
  func renderPage(
    _ options: NSDictionary,
    resolver resolve: RCTPromiseResolveBlock,
    rejecter reject: RCTPromiseRejectBlock
  ) {
    guard
      let pdfPath = options["pdfPath"] as? String,
      let pageNumber = options["page"] as? Int,
      let requestedWidth = options["width"] as? Int,
      let requestedHeight = options["height"] as? Int,
      let url = resolveUrl(pdfPath),
      let document = PDFDocument(url: url),
      let page = document.page(at: pageNumber - 1)
    else {
      reject("RENDER_PAGE_ERROR", "Invalid render options", nil)
      return
    }

    let pageBounds = page.bounds(for: .mediaBox)
    let pageRatio = pageBounds.width / pageBounds.height
    let requestedRatio = CGFloat(requestedWidth) / CGFloat(requestedHeight)

    let renderWidth: Int
    let renderHeight: Int

    if requestedRatio > pageRatio {
      renderHeight = requestedHeight
      renderWidth = Int(CGFloat(requestedHeight) * pageRatio)
    } else {
      renderWidth = requestedWidth
      renderHeight = Int(CGFloat(requestedWidth) / pageRatio)
    }

    let imageSize = CGSize(width: renderWidth, height: renderHeight)

    UIGraphicsBeginImageContextWithOptions(imageSize, true, 1.0)
    guard let context = UIGraphicsGetCurrentContext() else {
      reject("RENDER_PAGE_ERROR", "Unable to create graphics context", nil)
      return
    }

    UIColor.white.set()
    context.fill(CGRect(origin: .zero, size: imageSize))

    context.saveGState()

    context.translateBy(x: 0, y: imageSize.height)
    context.scaleBy(x: 1.0, y: -1.0)

    let scale = min(
      imageSize.width / pageBounds.width,
      imageSize.height / pageBounds.height
    )

    context.scaleBy(x: scale, y: scale)
    context.translateBy(x: -pageBounds.origin.x, y: -pageBounds.origin.y)

    page.draw(with: .mediaBox, to: context)

    context.restoreGState()

    guard let image = UIGraphicsGetImageFromCurrentImageContext() else {
      UIGraphicsEndImageContext()
      reject("RENDER_PAGE_ERROR", "Unable to render page image", nil)
      return
    }

    UIGraphicsEndImageContext()

    guard let pngData = image.pngData() else {
      reject("RENDER_PAGE_ERROR", "Unable to encode PNG", nil)
      return
    }

    do {
      let cacheDir = try getCacheDir(pdfPath: pdfPath)
      let outputUrl = cacheDir.appendingPathComponent(
        "page_\(pageNumber)_\(renderWidth)x\(renderHeight).png"
      )

      try pngData.write(to: outputUrl)

      resolve([
        "uri": outputUrl.absoluteString,
        "width": renderWidth,
        "height": renderHeight,
        "aspectRatio": Double(pageRatio),
        "page": pageNumber,
        "totalPages": document.pageCount
      ])
    } catch {
      reject("RENDER_PAGE_ERROR", error.localizedDescription, error)
    }
  }

  @objc
  func clearDocumentCache(
    _ pdfPath: String,
    resolver resolve: RCTPromiseResolveBlock,
    rejecter reject: RCTPromiseRejectBlock
  ) {
    do {
      let cacheDir = try getCacheDir(pdfPath: pdfPath)
      if FileManager.default.fileExists(atPath: cacheDir.path) {
        try FileManager.default.removeItem(at: cacheDir)
      }
      try FileManager.default.createDirectory(at: cacheDir, withIntermediateDirectories: true)
      resolve(true)
    } catch {
      reject("DOCUMENT_CACHE_CLEAR_ERROR", error.localizedDescription, error)
    }
  }

  private func resolveUrl(_ pathOrUri: String) -> URL? {
    if pathOrUri.starts(with: "file://") {
      return URL(string: pathOrUri)
    }

    return URL(fileURLWithPath: pathOrUri)
  }

  private func getCacheDir(pdfPath: String) throws -> URL {
    let cacheRoot = FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask)[0]
    let pdfKey = String(pdfPath.hashValue)

    let dir = cacheRoot
      .appendingPathComponent("airscore-rendered-pages")
      .appendingPathComponent(pdfKey)

    try FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)

    return dir
  }
}
```

### 2. Add Objective-C bridge file

Create:

```objc
// ios/AirScorePdfRendererBridge.m

#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(AirScorePdfRenderer, NSObject)

RCT_EXTERN_METHOD(getPageCount:
                  (NSString *)pdfPath
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(renderPage:
                  (NSDictionary *)options
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(clearDocumentCache:
                  (NSString *)pdfPath
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

@end
```

### 3. Update your TS wrapper

Change this:

```ts
if (Platform.OS !== "android" || !nativeModule) {
```

to:

```ts
if (!["android", "ios"].includes(Platform.OS) || !nativeModule) {
```

And update the error:

```ts
throw new Error(
  "AirScorePdfRenderer is only available in the native Android/iOS build."
);
```

### 4. Rebuild iOS

You’ll need a native iOS build:

```bash
npx expo run:ios
```

or build from Xcode.

The main idea: **same JS API, platform-specific native implementation.** Android keeps Kotlin `PdfRenderer`; iOS gets Swift `PDFKit`; both output PNG files consumed by `expo-image`.
