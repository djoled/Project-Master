
import 'package:dio/dio.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

// This file assumes 'generated/project_master_client.dart' exists 
// after running the OpenApi generator against the Elysia Swagger endpoint.
// import 'generated/project_master_client.dart'; 

part 'api_client_provider.g.dart';

@riverpod
Dio dioClient(DioClientRef ref) {
  final dio = Dio(BaseOptions(
    baseUrl: 'http://localhost:3000', // Change for Production
    connectTimeout: const Duration(seconds: 10),
  ));

  // Interceptor to inject Supabase JWT
  dio.interceptors.add(InterceptorsWrapper(
    onRequest: (options, handler) async {
      final session = Supabase.instance.client.auth.currentSession;
      if (session != null) {
        options.headers['Authorization'] = 'Bearer ${session.accessToken}';
      }
      return handler.next(options);
    },
  ));

  return dio;
}

// @riverpod
// ProjectMasterClient apiClient(ApiClientRef ref) {
//   final dio = ref.watch(dioClientProvider);
//   return ProjectMasterClient(dio);
// }
