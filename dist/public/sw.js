/**
 * Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *     http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// If the loader is already loaded, just stop.
if (!self.define) {
  let registry = {};

  // Used for `eval` and `importScripts` where we can't get script URL by other means.
  // In both cases, it's safe to use a global var because those functions are synchronous.
  let nextDefineUri;

  const singleRequire = (uri, parentUri) => {
    uri = new URL(uri + ".js", parentUri).href;
    return registry[uri] || (
      
        new Promise(resolve => {
          if ("document" in self) {
            const script = document.createElement("script");
            script.src = uri;
            script.onload = resolve;
            document.head.appendChild(script);
          } else {
            nextDefineUri = uri;
            importScripts(uri);
            resolve();
          }
        })
      
      .then(() => {
        let promise = registry[uri];
        if (!promise) {
          throw new Error(`Module ${uri} didn’t register its module`);
        }
        return promise;
      })
    );
  };

  self.define = (depsNames, factory) => {
    const uri = nextDefineUri || ("document" in self ? document.currentScript.src : "") || location.href;
    if (registry[uri]) {
      // Module is already loading or loaded.
      return;
    }
    let exports = {};
    const require = depUri => singleRequire(depUri, uri);
    const specialDeps = {
      module: { uri },
      exports,
      require
    };
    registry[uri] = Promise.all(depsNames.map(
      depName => specialDeps[depName] || require(depName)
    )).then(deps => {
      factory(...deps);
      return exports;
    });
  };
}
define(['./workbox-5a5d9309'], (function (workbox) { 'use strict';

  self.skipWaiting();
  workbox.clientsClaim();

  /**
   * The precacheAndRoute() method efficiently caches and responds to
   * requests for URLs in the manifest.
   * See https://goo.gl/S9QRab
   */
  workbox.precacheAndRoute([{
    "url": "registerSW.js",
    "revision": "1872c500de691dce40960bb85481de07"
  }, {
    "url": "index.html",
    "revision": "527b9467ad82944e9fe63e3233d8ac25"
  }, {
    "url": "assets/zap-DYsacEzj.js",
    "revision": null
  }, {
    "url": "assets/WaiterTerminalPage-BZm1347g.js",
    "revision": null
  }, {
    "url": "assets/utensils-crossed-CBMLB8wQ.js",
    "revision": null
  }, {
    "url": "assets/utensils-B-Aw6efP.js",
    "revision": null
  }, {
    "url": "assets/users-Bp-JrhfB.js",
    "revision": null
  }, {
    "url": "assets/useRazorpay-C8oD9Onc.js",
    "revision": null
  }, {
    "url": "assets/user-plus-7sHLJB-I.js",
    "revision": null
  }, {
    "url": "assets/user-B4ygdWGt.js",
    "revision": null
  }, {
    "url": "assets/trending-up-B_af05ri.js",
    "revision": null
  }, {
    "url": "assets/trash-2-UwZPQnRl.js",
    "revision": null
  }, {
    "url": "assets/TransactionsPage-rHLdGSMr.js",
    "revision": null
  }, {
    "url": "assets/textarea-CQMoi_qX.js",
    "revision": null
  }, {
    "url": "assets/TestimonialsSection-D-LjSdY0.js",
    "revision": null
  }, {
    "url": "assets/TermsOfServicePage-DATfZCHP.js",
    "revision": null
  }, {
    "url": "assets/tabs-8AUooV8Y.js",
    "revision": null
  }, {
    "url": "assets/table-DzeXcRRE.js",
    "revision": null
  }, {
    "url": "assets/table-AmtRupuj.js",
    "revision": null
  }, {
    "url": "assets/switch-Dd7P-9B5.js",
    "revision": null
  }, {
    "url": "assets/sun-UIoBGRNZ.js",
    "revision": null
  }, {
    "url": "assets/SubscriptionExpiredPage-Dzo2feVg.js",
    "revision": null
  }, {
    "url": "assets/store-XunlpFLY.js",
    "revision": null
  }, {
    "url": "assets/StaffSubscriptionExpiredPage-C_qHtA2a.js",
    "revision": null
  }, {
    "url": "assets/StaffManagementPage-CCwhKly8.js",
    "revision": null
  }, {
    "url": "assets/sparkles-CK2gPSw3.js",
    "revision": null
  }, {
    "url": "assets/skeleton-C4zP0Ttb.js",
    "revision": null
  }, {
    "url": "assets/shopping-cart-DpCdbQlA.js",
    "revision": null
  }, {
    "url": "assets/shield-check-BgA8TGTO.js",
    "revision": null
  }, {
    "url": "assets/SettingsPage-Q4EPg9_2.js",
    "revision": null
  }, {
    "url": "assets/separator-e8anC7Ms.js",
    "revision": null
  }, {
    "url": "assets/send-DAFFCTFW.js",
    "revision": null
  }, {
    "url": "assets/select-DSKse9Lp.js",
    "revision": null
  }, {
    "url": "assets/search-Dezv0Glh.js",
    "revision": null
  }, {
    "url": "assets/scroll-area-D7f3x41M.js",
    "revision": null
  }, {
    "url": "assets/refresh-cw-Bzz2VoFd.js",
    "revision": null
  }, {
    "url": "assets/receipt-W6n37VBG.js",
    "revision": null
  }, {
    "url": "assets/radio-group-CrTA-EQZ.js",
    "revision": null
  }, {
    "url": "assets/QueueRegistrationPage-BzG4eLDU.js",
    "revision": null
  }, {
    "url": "assets/QueuePage-BEMGUxWV.js",
    "revision": null
  }, {
    "url": "assets/QRCodesPage-7yi8FN2V.js",
    "revision": null
  }, {
    "url": "assets/qr-code-Ddj5cwBp.js",
    "revision": null
  }, {
    "url": "assets/purify.es-C_uT9hQ1.js",
    "revision": null
  }, {
    "url": "assets/PublicMenuPage-BrPBN90D.js",
    "revision": null
  }, {
    "url": "assets/proxy-opKp3I7f.js",
    "revision": null
  }, {
    "url": "assets/PrivacyPolicyPage-rKLwgRfO.js",
    "revision": null
  }, {
    "url": "assets/plus-iF0E9Wez.js",
    "revision": null
  }, {
    "url": "assets/phone-DUmFf1VH.js",
    "revision": null
  }, {
    "url": "assets/OnboardingPage-Cnx0uzsQ.js",
    "revision": null
  }, {
    "url": "assets/MenuPage-DZop-rVk.js",
    "revision": null
  }, {
    "url": "assets/map-pin-CUkoRqvv.js",
    "revision": null
  }, {
    "url": "assets/mail-BOLhHCUV.js",
    "revision": null
  }, {
    "url": "assets/LoginPage-LSOwtMMr.js",
    "revision": null
  }, {
    "url": "assets/log-out-CdIr7XIA.js",
    "revision": null
  }, {
    "url": "assets/LiveOrdersPage-DTzCqcrT.js",
    "revision": null
  }, {
    "url": "assets/LanguageSelector-DYuC5HdK.js",
    "revision": null
  }, {
    "url": "assets/LandingPage-BiiI_AFd.js",
    "revision": null
  }, {
    "url": "assets/label-BAEj2giP.js",
    "revision": null
  }, {
    "url": "assets/kot-data-BOfpsrFX.js",
    "revision": null
  }, {
    "url": "assets/KitchenKDSPage-DlZwy5Cz.js",
    "revision": null
  }, {
    "url": "assets/key-round-Ck-ZXaPm.js",
    "revision": null
  }, {
    "url": "assets/InventoryPage-BnBcLibX.js",
    "revision": null
  }, {
    "url": "assets/input-DP_TaHZO.js",
    "revision": null
  }, {
    "url": "assets/index.es-YBpmo8Lv.js",
    "revision": null
  }, {
    "url": "assets/index-DgVVZul9.js",
    "revision": null
  }, {
    "url": "assets/index-Db1QWdJg.js",
    "revision": null
  }, {
    "url": "assets/index-CzfwYVMo.js",
    "revision": null
  }, {
    "url": "assets/index-CneTjIMo.js",
    "revision": null
  }, {
    "url": "assets/index-Bqxq7DP3.css",
    "revision": null
  }, {
    "url": "assets/index-BdQq_4o_.js",
    "revision": null
  }, {
    "url": "assets/html2canvas.esm-CBrSDip1.js",
    "revision": null
  }, {
    "url": "assets/globe-C-uKXd7i.js",
    "revision": null
  }, {
    "url": "assets/formatDistanceToNow-Crqrgwto.js",
    "revision": null
  }, {
    "url": "assets/format-K_dhCO_h.js",
    "revision": null
  }, {
    "url": "assets/FoodShowcaseSection-Dn9Q0NrO.js",
    "revision": null
  }, {
    "url": "assets/FloorMapPage-ClCwc5pk.js",
    "revision": null
  }, {
    "url": "assets/FeaturesSection--gOaJXsB.js",
    "revision": null
  }, {
    "url": "assets/eye-C7-gJggF.js",
    "revision": null
  }, {
    "url": "assets/external-link-C341JdX4.js",
    "revision": null
  }, {
    "url": "assets/en-US-DsS4pHqz.js",
    "revision": null
  }, {
    "url": "assets/download-0U4R3muI.js",
    "revision": null
  }, {
    "url": "assets/dollar-sign-iYK7N4Az.js",
    "revision": null
  }, {
    "url": "assets/differenceInMilliseconds-Q6T7lIof.js",
    "revision": null
  }, {
    "url": "assets/dialog-CGFsDx0z.js",
    "revision": null
  }, {
    "url": "assets/desktoppos-5BtyJeF8.js",
    "revision": null
  }, {
    "url": "assets/DashboardPage-CmVId6FX.js",
    "revision": null
  }, {
    "url": "assets/DashboardLayout-B_B1zxLE.js",
    "revision": null
  }, {
    "url": "assets/crown-ByAClZSE.js",
    "revision": null
  }, {
    "url": "assets/credit-card-BTEcA7A0.js",
    "revision": null
  }, {
    "url": "assets/copy-BkW8VSEi.js",
    "revision": null
  }, {
    "url": "assets/ContactSection-DPmEBbZo.js",
    "revision": null
  }, {
    "url": "assets/constants-CzULGhDK.js",
    "revision": null
  }, {
    "url": "assets/command-V_PEGnJq.js",
    "revision": null
  }, {
    "url": "assets/clock-wpFFnybd.js",
    "revision": null
  }, {
    "url": "assets/circle-x-CfqhDt_p.js",
    "revision": null
  }, {
    "url": "assets/circle-minus-oYBdJY4D.js",
    "revision": null
  }, {
    "url": "assets/circle-check-BZGviot6.js",
    "revision": null
  }, {
    "url": "assets/chevron-right-DUNqYOJg.js",
    "revision": null
  }, {
    "url": "assets/chevron-left-Dqb0Ce0J.js",
    "revision": null
  }, {
    "url": "assets/chevron-down-BWI2qHC1.js",
    "revision": null
  }, {
    "url": "assets/chef-hat-OxhUmnh7.js",
    "revision": null
  }, {
    "url": "assets/checkbox-dlzda8Zl.js",
    "revision": null
  }, {
    "url": "assets/check-DV7n5ZJv.js",
    "revision": null
  }, {
    "url": "assets/chart-column-BeH4YrC0.js",
    "revision": null
  }, {
    "url": "assets/CancelledOrdersPage-JItmawvU.js",
    "revision": null
  }, {
    "url": "assets/calendar-BScQ0vxE.js",
    "revision": null
  }, {
    "url": "assets/bell-DwJwEuAA.js",
    "revision": null
  }, {
    "url": "assets/BarChart-D4waIff6.js",
    "revision": null
  }, {
    "url": "assets/badge-B3aqRgTm.js",
    "revision": null
  }, {
    "url": "assets/arrow-left-DenN4ahU.js",
    "revision": null
  }, {
    "url": "assets/api-eCOkCBz3.js",
    "revision": null
  }, {
    "url": "assets/AnalyticsPage-vaB0Ld8U.js",
    "revision": null
  }, {
    "url": "assets/alert-dialog-DXdZfIGp.js",
    "revision": null
  }, {
    "url": "favicon.png",
    "revision": "6c6d75635e62ca8b93f4ef252e5b5647"
  }, {
    "url": "pwa-192x192.png",
    "revision": "6c6d75635e62ca8b93f4ef252e5b5647"
  }, {
    "url": "pwa-512x512.png",
    "revision": "6c6d75635e62ca8b93f4ef252e5b5647"
  }, {
    "url": "manifest.webmanifest",
    "revision": "3afd52c29c53fff3691594654031ff42"
  }], {});
  workbox.cleanupOutdatedCaches();
  workbox.registerRoute(new workbox.NavigationRoute(workbox.createHandlerBoundToURL("index.html")));

}));
