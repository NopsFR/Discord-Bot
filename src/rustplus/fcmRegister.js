const axios = require('axios');
const AndroidFCM = require('@liamcottle/push-receiver/src/android/fcm');

/**
 * Constants for the Rust+ companion app, mirrored from the official
 * rustplus.js CLI (`fcm-register`).
 */
const RUST_COMPANION = {
  apiKey: 'AIzaSyB5y2y-Tzqb4-I4Qnlsh_9naYv_TD8pCvY',
  projectId: 'rust-companion-app',
  gcmSenderId: '976529667804',
  gmsAppId: '1:976529667804:android:d6f1ddeb4403b338fea619',
  androidPackageName: 'com.facepunch.rust.companion',
  androidPackageCert: 'E28D05345FB78A7A1A63D70F4A302DBF426CA5AD'
};

/**
 * Register a fresh set of FCM credentials with Google and exchange the FCM
 * token for an Expo push token. These are unique per registration, so each
 * Discord user that links their account gets their own credentials.
 */
async function registerFcmCredentials() {
  const fcmCredentials = await AndroidFCM.register(
    RUST_COMPANION.apiKey,
    RUST_COMPANION.projectId,
    RUST_COMPANION.gcmSenderId,
    RUST_COMPANION.gmsAppId,
    RUST_COMPANION.androidPackageName,
    RUST_COMPANION.androidPackageCert
  );

  const expoPushToken = await getExpoPushToken(fcmCredentials.fcm.token);

  return { fcmCredentials, expoPushToken };
}

async function getExpoPushToken(fcmToken) {
  const response = await axios.post('https://exp.host/--/api/v2/push/getExpoPushToken', {
    type: 'fcm',
    deviceId: cryptoRandomId(),
    development: false,
    appId: 'com.facepunch.rust.companion',
    deviceToken: fcmToken,
    projectId: '49451aca-a822-41e6-ad59-955718d0ff9c'
  });

  return response.data.data.expoPushToken;
}

/**
 * Register the Expo push token with the Rust+ companion API using the Steam
 * linked auth token. After this, the user's in-game pairing requests are
 * delivered to our FCM listener.
 */
async function registerWithRustPlus(rustplusAuthToken, expoPushToken) {
  await axios.post('https://companion-rust.facepunch.com:443/api/push/register', {
    AuthToken: rustplusAuthToken,
    DeviceId: 'rustplus.js',
    PushKind: 3,
    PushToken: expoPushToken
  });
}

function cryptoRandomId() {
  return require('node:crypto').randomUUID();
}

module.exports = {
  RUST_COMPANION,
  registerFcmCredentials,
  registerWithRustPlus
};
