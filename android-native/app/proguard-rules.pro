# WebRTC is called through JNI.
-keep class org.webrtc.** { *; }
-dontwarn org.webrtc.**
# socket.io / engine.io
-keep class io.socket.** { *; }
-dontwarn io.socket.**
-dontwarn okhttp3.internal.platform.**
-dontwarn org.conscrypt.**
-dontwarn org.bouncycastle.**
-dontwarn org.openjsse.**
