// main.dart
// Nexus AI Pro - Flutter Multiplatform App
// Military-Grade Encrypted AI Platform

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import 'theme/grayscale_theme.dart';
import 'providers/app_provider.dart';
import 'providers/chat_provider.dart';
import 'providers/security_provider.dart';
import 'screens/main_screen.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  // Set system UI overlay style
  SystemChrome.setSystemUIOverlayStyle(const SystemUiOverlayStyle(
    statusBarColor: Colors.transparent,
    statusBarIconBrightness: Brightness.light,
    systemNavigationBarColor: Color(0xFF0D0D0D),
    systemNavigationBarIconBrightness: Brightness.light,
  ));
  
  // Initialize secure storage
  const storage = FlutterSecureStorage();
  
  runApp(
    MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AppProvider()),
        ChangeNotifierProvider(create: (_) => ChatProvider()),
        ChangeNotifierProvider(create: (_) => SecurityProvider()),
      ],
      child: const NexusAIApp(),
    ),
  );
}

class NexusAIApp extends StatelessWidget {
  const NexusAIApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Nexus AI Pro',
      debugShowCheckedModeBanner: false,
      theme: GrayscaleTheme.darkTheme,
      home: const MainScreen(),
    );
  }
}
