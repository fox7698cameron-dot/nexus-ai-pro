// grayscale_theme.dart
// Nexus AI Pro - Grayscale Theme

import 'package:flutter/material.dart';

class GrayscaleTheme {
  // Backgrounds
  static const Color bgPrimary = Color(0xFF0D0D0D);
  static const Color bgSecondary = Color(0xFF141414);
  static const Color bgTertiary = Color(0xFF1A1A1A);
  static const Color bgCard = Color(0xFF1F1F1F);
  static const Color bgHover = Color(0xFF252525);
  static const Color bgElevated = Color(0xFF2A2A2A);
  
  // Text
  static const Color textPrimary = Color(0xFFFFFFFF);
  static const Color textSecondary = Color(0xFFB0B0B0);
  static const Color textMuted = Color(0xFF707070);
  static const Color textDisabled = Color(0xFF505050);
  
  // Borders
  static const Color border = Color(0xFF2A2A2A);
  static const Color borderLight = Color(0xFF3A3A3A);
  static const Color borderFocus = Color(0xFF606060);
  
  // Accents
  static const Color accent = Color(0xFF909090);
  static const Color accentLight = Color(0xFFB0B0B0);
  static const Color accentDark = Color(0xFF606060);
  
  // Gradients
  static const LinearGradient gradientPrimary = LinearGradient(
    colors: [Color(0xFF4A4A4A), Color(0xFF2A2A2A), Color(0xFF1A1A1A)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );
  
  static const LinearGradient gradientSecondary = LinearGradient(
    colors: [Color(0xFF3A3A3A), Color(0xFF2A2A2A)],
    begin: Alignment.topCenter,
    end: Alignment.bottomCenter,
  );
  
  static const LinearGradient gradientAccent = LinearGradient(
    colors: [Color(0xFF606060), Color(0xFF404040)],
    begin: Alignment.centerLeft,
    end: Alignment.centerRight,
  );
  
  static const LinearGradient gradientSpaceship = LinearGradient(
    colors: [Color(0xFFC0C0C0), Color(0xFF808080), Color(0xFF404040)],
    begin: Alignment.topCenter,
    end: Alignment.bottomCenter,
  );
  
  // Theme Data
  static ThemeData get darkTheme => ThemeData(
    brightness: Brightness.dark,
    scaffoldBackgroundColor: bgPrimary,
    primaryColor: accent,
    colorScheme: const ColorScheme.dark(
      primary: accent,
      secondary: accentLight,
      background: bgPrimary,
      surface: bgSecondary,
      onPrimary: textPrimary,
      onSecondary: textPrimary,
      onBackground: textPrimary,
      onSurface: textPrimary,
    ),
    
    // App Bar
    appBarTheme: const AppBarTheme(
      backgroundColor: bgSecondary,
      elevation: 0,
      iconTheme: IconThemeData(color: textSecondary),
      titleTextStyle: TextStyle(
        color: textPrimary,
        fontSize: 18,
        fontWeight: FontWeight.bold,
      ),
    ),
    
    // Cards
    cardTheme: CardTheme(
      color: bgCard,
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: const BorderSide(color: border, width: 1),
      ),
    ),
    
    // Input
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: bgTertiary,
      hintStyle: const TextStyle(color: textMuted),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: border),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: border),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: borderFocus),
      ),
    ),
    
    // Buttons
    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        backgroundColor: accent,
        foregroundColor: textPrimary,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(10),
        ),
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
      ),
    ),
    
    // Text
    textTheme: const TextTheme(
      displayLarge: TextStyle(color: textPrimary, fontWeight: FontWeight.bold),
      displayMedium: TextStyle(color: textPrimary, fontWeight: FontWeight.bold),
      displaySmall: TextStyle(color: textPrimary, fontWeight: FontWeight.bold),
      headlineLarge: TextStyle(color: textPrimary, fontWeight: FontWeight.w600),
      headlineMedium: TextStyle(color: textPrimary, fontWeight: FontWeight.w600),
      headlineSmall: TextStyle(color: textPrimary, fontWeight: FontWeight.w600),
      titleLarge: TextStyle(color: textPrimary, fontWeight: FontWeight.w500),
      titleMedium: TextStyle(color: textPrimary, fontWeight: FontWeight.w500),
      titleSmall: TextStyle(color: textSecondary, fontWeight: FontWeight.w500),
      bodyLarge: TextStyle(color: textSecondary),
      bodyMedium: TextStyle(color: textSecondary),
      bodySmall: TextStyle(color: textMuted),
      labelLarge: TextStyle(color: textPrimary, fontWeight: FontWeight.w500),
      labelMedium: TextStyle(color: textSecondary),
      labelSmall: TextStyle(color: textMuted),
    ),
    
    // Divider
    dividerTheme: const DividerThemeData(
      color: border,
      thickness: 1,
    ),
    
    // Bottom Navigation
    bottomNavigationBarTheme: const BottomNavigationBarThemeData(
      backgroundColor: bgSecondary,
      selectedItemColor: textPrimary,
      unselectedItemColor: textMuted,
    ),
    
    // Dialog
    dialogTheme: DialogTheme(
      backgroundColor: bgSecondary,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
      ),
    ),
  );
}

// Assistant Colors (Grayscale variants)
class AssistantColors {
  static const Map<String, LinearGradient> gradients = {
    'nova': LinearGradient(
      colors: [Color(0xFF4A4A4A), Color(0xFF2D2D2D)],
      begin: Alignment.topLeft,
      end: Alignment.bottomRight,
    ),
    'cipher': LinearGradient(
      colors: [Color(0xFF3D3D3D), Color(0xFF1A1A1A)],
      begin: Alignment.topLeft,
      end: Alignment.bottomRight,
    ),
    'atlas': LinearGradient(
      colors: [Color(0xFF5A5A5A), Color(0xFF3A3A3A)],
      begin: Alignment.topLeft,
      end: Alignment.bottomRight,
    ),
    'pulse': LinearGradient(
      colors: [Color(0xFF6A6A6A), Color(0xFF4A4A4A)],
      begin: Alignment.topLeft,
      end: Alignment.bottomRight,
    ),
    'sentinel': LinearGradient(
      colors: [Color(0xFF505050), Color(0xFF2A2A2A)],
      begin: Alignment.topLeft,
      end: Alignment.bottomRight,
    ),
    'oracle': LinearGradient(
      colors: [Color(0xFF454545), Color(0xFF252525)],
      begin: Alignment.topLeft,
      end: Alignment.bottomRight,
    ),
  };
}
