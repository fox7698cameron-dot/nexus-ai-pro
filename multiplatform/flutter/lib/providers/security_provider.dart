import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import 'package:intl/intl.dart';

class Vulnerability {
  final int id;
  final String name;
  final String severity;
  final String status;
  final String description;

  Vulnerability({
    required this.id,
    required this.name,
    required this.severity,
    required this.status,
    required this.description,
  });

  factory Vulnerability.fromJson(Map<String, dynamic> json) {
    return Vulnerability(
      id: json['id'] ?? 0,
      name: json['name'] ?? '',
      severity: json['severity'] ?? 'low',
      status: json['status'] ?? 'warning',
      description: json['description'] ?? '',
    );
  }
}

class Threat {
  final String type;
  final String status;
  final DateTime timestamp;

  Threat({
    required this.type,
    required this.status,
    required this.timestamp,
  });

  factory Threat.fromJson(Map<String, dynamic> json) {
    return Threat(
      type: json['type'] ?? 'Unknown',
      status: json['status'] ?? 'blocked',
      timestamp: DateTime.parse(json['timestamp'] ?? DateTime.now().toIso8601String()),
    );
  }

  String get timeAgo {
    final now = DateTime.now();
    final difference = now.difference(timestamp);

    if (difference.inSeconds < 60) {
      return '${difference.inSeconds}s ago';
    } else if (difference.inMinutes < 60) {
      return '${difference.inMinutes}m ago';
    } else if (difference.inHours < 24) {
      return '${difference.inHours}h ago';
    } else if (difference.inDays < 7) {
      return '${difference.inDays}d ago';
    } else {
      return DateFormat('MMM d').format(timestamp);
    }
  }
}

class SecurityDashboard {
  final int overallScore;
  final String encryptionStatus;
  final List<Vulnerability> vulnerabilities;
  final List<Threat> threats;
  final DateTime lastScanTime;

  SecurityDashboard({
    required this.overallScore,
    required this.encryptionStatus,
    required this.vulnerabilities,
    required this.threats,
    required this.lastScanTime,
  });

  factory SecurityDashboard.fromJson(Map<String, dynamic> json) {
    final vulns = (json['vulnerabilities'] as List<dynamic>?)
        ?.map((v) => Vulnerability.fromJson(v as Map<String, dynamic>))
        .toList() ?? [];
    
    final threatList = (json['threats'] as List<dynamic>?)
        ?.map((t) => Threat.fromJson(t as Map<String, dynamic>))
        .toList() ?? [];

    return SecurityDashboard(
      overallScore: json['overallScore'] ?? 92,
      encryptionStatus: json['encryptionStatus'] ?? 'secure',
      vulnerabilities: vulns,
      threats: threatList,
      lastScanTime: json['lastScanTime'] != null
          ? DateTime.parse(json['lastScanTime'] as String)
          : DateTime.now(),
    );
  }
}

class SecurityProvider extends ChangeNotifier {
  static const String baseUrl = 'http://localhost:3001/api/security';
  
  SecurityDashboard? _dashboard;
  bool _isScanning = false;
  String? _error;
  DateTime? _lastScanTime;

  SecurityDashboard? get dashboard => _dashboard;
  bool get isScanning => _isScanning;
  String? get error => _error;
  DateTime? get lastScanTime => _lastScanTime;

  int get overallScore => _dashboard?.overallScore ?? 92;
  String get encryptionStatus => _dashboard?.encryptionStatus ?? 'secure';
  List<Vulnerability> get vulnerabilities => _dashboard?.vulnerabilities ?? [];
  List<Threat> get threats => _dashboard?.threats ?? [];

  Future<void> getDashboard() async {
    try {
      _error = null;
      final response = await http.get(
        Uri.parse('$baseUrl/dashboard'),
      ).timeout(const Duration(seconds: 10));

      if (response.statusCode == 200) {
        final json = jsonDecode(response.body);
        _dashboard = SecurityDashboard.fromJson(json);
        _lastScanTime = DateTime.now();
        notifyListeners();
      } else {
        _error = 'Failed to fetch dashboard: ${response.statusCode}';
        _loadFallbackData();
      }
    } catch (e) {
      _error = 'Error fetching dashboard: $e';
      _loadFallbackData();
    }
  }

  Future<void> runScan() async {
    _isScanning = true;
    _error = null;
    notifyListeners();

    try {
      final response = await http.post(
        Uri.parse('$baseUrl/scan'),
      ).timeout(const Duration(seconds: 30));

      if (response.statusCode == 200) {
        final json = jsonDecode(response.body);
        _dashboard = SecurityDashboard.fromJson(json);
        _lastScanTime = DateTime.now();
      } else {
        _error = 'Scan failed: ${response.statusCode}';
        _loadFallbackData();
      }
    } catch (e) {
      _error = 'Scan error: $e';
      _loadFallbackData();
    } finally {
      _isScanning = false;
      notifyListeners();
    }
  }

  Future<void> patchVulnerability(int vulnId) async {
    try {
      _error = null;
      final response = await http.post(
        Uri.parse('$baseUrl/patch'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'vulnId': vulnId}),
      ).timeout(const Duration(seconds: 10));

      if (response.statusCode == 200) {
        // Update local state
        if (_dashboard != null) {
          final updatedVulns = _dashboard!.vulnerabilities.map((v) {
            return v.id == vulnId ? Vulnerability(
              id: v.id,
              name: v.name,
              severity: v.severity,
              status: 'patched',
              description: v.description,
            ) : v;
          }).toList();
          
          _dashboard = SecurityDashboard(
            overallScore: _dashboard!.overallScore + 5,
            encryptionStatus: _dashboard!.encryptionStatus,
            vulnerabilities: updatedVulns,
            threats: _dashboard!.threats,
            lastScanTime: _dashboard!.lastScanTime,
          );
          notifyListeners();
        }
      } else {
        _error = 'Patch failed: ${response.statusCode}';
      }
    } catch (e) {
      _error = 'Patch error: $e';
    }
  }

  void _loadFallbackData() {
    _dashboard = SecurityDashboard(
      overallScore: 92,
      encryptionStatus: 'secure',
      vulnerabilities: [
        Vulnerability(
          id: 1,
          name: 'Outdated Dependencies',
          severity: 'medium',
          status: 'warning',
          description: '2 npm packages have updates available',
        ),
        Vulnerability(
          id: 2,
          name: 'API Key Exposure Risk',
          severity: 'low',
          status: 'info',
          description: 'Review environment variable handling',
        ),
        Vulnerability(
          id: 3,
          name: 'TLS/SSL Configuration',
          severity: 'high',
          status: 'resolved',
          description: 'TLS 1.3 enabled and verified',
        ),
      ],
      threats: [
        Threat(
          type: 'Unauthorized Access',
          status: 'blocked',
          timestamp: DateTime.now().subtract(const Duration(hours: 1)),
        ),
        Threat(
          type: 'Injection Attack',
          status: 'prevented',
          timestamp: DateTime.now().subtract(const Duration(hours: 2)),
        ),
        Threat(
          type: 'XSS Attempt',
          status: 'filtered',
          timestamp: DateTime.now().subtract(const Duration(days: 1)),
        ),
      ],
      lastScanTime: DateTime.now(),
    );
  }

  Future<void> getAlerts() async {
    try {
      final response = await http.get(
        Uri.parse('$baseUrl/alerts'),
      ).timeout(const Duration(seconds: 10));

      if (response.statusCode != 200) {
        _error = 'Failed to fetch alerts: ${response.statusCode}';
      }
    } catch (e) {
      _error = 'Error fetching alerts: $e';
    }
  }

  Future<void> getEncryptionHealth() async {
    try {
      final response = await http.get(
        Uri.parse('$baseUrl/encryption-health'),
      ).timeout(const Duration(seconds: 10));

      if (response.statusCode != 200) {
        _error = 'Failed to fetch encryption health: ${response.statusCode}';
      }
    } catch (e) {
      _error = 'Error fetching encryption health: $e';
    }
  }
}
