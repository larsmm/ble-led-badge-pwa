# BLE LED Badge PWA

Control compatible BLE LED name badges directly from a browser. The app is
designed mainly for use on a smartphone.

## What You Can Do

- send text to a compatible BLE LED badge
- insert common badge-readable symbols into text
- choose badge fonts, scroll mode, brightness, speed, and letter spacing
- save text presets
- draw or import custom 48 x 12 pixel images
- save named pixel presets
- upload custom images to the badge
- trigger built-in badge animations
- export and import your saved app data
- more options will be added in the future

Some stored-image-slot tools are experimental and may not do anything on every
badge.

## Supported Platforms

Tested platforms:

- Android with Chrome
- Windows with Chrome

The PWA may also work on other platforms and Chromium-based browsers that
support Web Bluetooth. Browser support for Web Bluetooth is not universal, so
untested platforms may behave differently.

If you try the app on another platform and run into problems, please leave an
issue with your browser, operating system, badge model, and what happened.

## Install On Smartphone

The app runs in the browser and can be installed as a PWA when Chrome offers the
install option.

1. Open in Android Chrome: [https://larsmm.github.io/ble-led-badge-pwa/](https://larsmm.github.io/ble-led-badge-pwa/)
2. Wait until the app has loaded.
3. Open Chrome's menu.
4. Choose `Install app` or `Add to Home screen`, if available.
5. Start the app from the home screen.

If no install option appears, the app can still be used directly in the browser.
Chrome decides when it shows the install prompt, so the missing button does not
necessarily mean that the app is broken.

After the app has been installed and loaded once, it is intended to work
offline for normal badge use. Internet access is mainly needed for the first
download, future updates, or after browser/app data has been cleared.

## First Use

1. Turn on your LED badge.
2. Open the app in Android Chrome.
3. Tap `Connect Badge`.
4. Select your badge from the Bluetooth device list.
5. Enter text on the `Text` page.
6. Tap `Send Text`.

## Supported Badges

BLE LED badges are sold with different display resolutions. Common variants are:

- `11 x 44` pixels
- `12 x 48` pixels

This app currently supports only badges with a `12 x 48` pixel display.

Known compatible badges:

- BLE name: `DSD-78320A`
  BLE service ID: `0000FEE9-0000-1000-8000-00805F9B34FB`
  Link: `https://de.aliexpress.com/item/1005006261487297.html` (ordered 2026-03)

Compatibility depends on the BLE service IDs exposed by the badge. The app
currently targets badges that expose the service ID:

```text
0000FEE9-0000-1000-8000-00805F9B34FB
```

The important part for a quick first check is the first eight characters:

```text
0000FEE9
```

If your badge advertises a matching custom service, there is a good chance that
it is compatible.

If the project owner gets access to other compatible badge types in the future,
support for additional display resolutions may be added later.

## Check Badge Compatibility

You can inspect your badge with an Android BLE scanner app before trying the
PWA.

One possible app is `BLE Scanner` for Android.

Rough workflow:

1. Install and open `BLE Scanner` on Android.
2. Turn on the badge.
3. Scan for nearby BLE devices.
4. Connect to the badge.
5. Look at the listed services.

You will usually see entries such as:

- `Generic Access`
- one or more `Custom Service` entries

Each `Custom Service` entry shows a long ID in a format similar to:

```text
0000AE00-0000-1000-8000-00805F9B34FB
```

For this PWA, look at the first eight characters of each custom service ID. A
known compatible target looks like:

```text
0000FEE9
```

When reporting compatibility, include:

- badge name or product link
- pixel resolution
- browser and operating system
- visible custom service IDs
- BLE device name
- whether connecting worked
- whether sending text worked
- whether image upload worked

## Local Data

The app stores your settings locally in the browser on your device.

Stored locally:

- current text and font settings
- text presets
- pixel image presets

This data is stored in the browser's local storage. It is not uploaded to a
server by the app.

If you clear browser site data, use another browser, use another device, or open
the app under a different URL, the saved data may not be available. It may
survive page reloads, browser restarts and even opening the app in a new tab.

On the `Status` page, you can export a backup of your app data and import it
again later. This is useful before clearing browser data or moving presets to
another device.

## Privacy

The app works locally in your browser. Badge data, text presets, and pixel
presets stay on your device unless you manually export a backup file or share
your data yourself.

If you use the hosted version on GitHub Pages, GitHub receives the normal web
requests needed to deliver the app files. That can include requests for the
page itself and for PWA-related files such as the manifest, icons, or service
worker. The app itself does not send your badge text, pixel presets, backups,
or Bluetooth data to GitHub.

The app does not use external scripts, external analytics, or externally hosted
web fonts such as Google Fonts.

## Project Origin

This PWA was created using the `ble-led-badge` project as a technical reference
for protocol behavior and badge data handling.

Reference repository:

```text
https://github.com/timhodson/ble-led-badge
```

## License

The project is intended for non-commercial public use under:

```text
PolyForm Noncommercial 1.0.0
```

Commercial use is not permitted under the public project license. For
commercial licensing, contact me.

Third-party fonts and adapted reference material keep their own licenses. See:

- [LICENSE](LICENSE)
- [NOTICE](NOTICE)
- [THIRD_PARTY_LICENSES.md](THIRD_PARTY_LICENSES.md)

## Building The App

This README is focused on using the app. Developer build and deployment notes
are in:

```text
docs/build-and-deploy.md
```
