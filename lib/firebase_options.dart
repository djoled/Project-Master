
// File generated manually to support migration based on provided firebase.ts
import 'package:firebase_core/firebase_core.dart' show FirebaseOptions;
import 'package:flutter/foundation.dart' show defaultTargetPlatform, kIsWeb, TargetPlatform;

class DefaultFirebaseOptions {
  static FirebaseOptions get currentPlatform {
    if (kIsWeb) {
      return web;
    }
    switch (defaultTargetPlatform) {
      case TargetPlatform.android:
        return android;
      case TargetPlatform.iOS:
        return ios;
      case TargetPlatform.macOS:
        return macos;
      case TargetPlatform.windows:
        throw UnsupportedError(
          'DefaultFirebaseOptions have not been configured for windows - '
          'you can reconfigure this by running the FlutterFire CLI again.',
        );
      case TargetPlatform.linux:
        throw UnsupportedError(
          'DefaultFirebaseOptions have not been configured for linux - '
          'you can reconfigure this by running the FlutterFire CLI again.',
        );
      default:
        throw UnsupportedError(
          'DefaultFirebaseOptions are not supported for this platform.',
        );
    }
  }

  static const FirebaseOptions web = FirebaseOptions(
    apiKey: 'AIzaSyAVCV3ByVIMLd4acgxV22_swj80BLtgr48',
    appId: '1:805917410561:web:33a509f01571fe7ce0c700',
    messagingSenderId: '805917410561',
    projectId: 'project-master-101',
    authDomain: 'project-master-101.firebaseapp.com',
    storageBucket: 'project-master-101.firebasestorage.app',
    measurementId: 'G-16PCF9JGDZ',
  );

  static const FirebaseOptions android = FirebaseOptions(
    apiKey: 'AIzaSyAVCV3ByVIMLd4acgxV22_swj80BLtgr48', // Using Web Key as fallback for MVP
    appId: '1:805917410561:web:33a509f01571fe7ce0c700',
    messagingSenderId: '805917410561',
    projectId: 'project-master-101',
    storageBucket: 'project-master-101.firebasestorage.app',
  );

  static const FirebaseOptions ios = FirebaseOptions(
    apiKey: 'AIzaSyAVCV3ByVIMLd4acgxV22_swj80BLtgr48', // Using Web Key as fallback for MVP
    appId: '1:805917410561:web:33a509f01571fe7ce0c700',
    messagingSenderId: '805917410561',
    projectId: 'project-master-101',
    storageBucket: 'project-master-101.firebasestorage.app',
  );

  static const FirebaseOptions macos = FirebaseOptions(
    apiKey: 'AIzaSyAVCV3ByVIMLd4acgxV22_swj80BLtgr48', // Using Web Key as fallback for MVP
    appId: '1:805917410561:web:33a509f01571fe7ce0c700',
    messagingSenderId: '805917410561',
    projectId: 'project-master-101',
    storageBucket: 'project-master-101.firebasestorage.app',
  );
}
