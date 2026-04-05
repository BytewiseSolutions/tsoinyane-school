import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { getAuthorizationHeader } from '../auth/auth-session';

@Injectable({
  providedIn: 'root',
})
export class BackendService {
  private readonly apiUrl = environment.apiUrl.replace(/\/+$/, '');

  constructor(private http: HttpClient) {}

  get<T>(endpoint: string, params?: HttpParams | Record<string, string | number | boolean>): Observable<T> {
    return this.http.get<T>(this.buildUrl(endpoint), {
      params: this.toHttpParams(params),
      headers: this.buildHeaders(),
    });
  }

  post<T, B = unknown>(endpoint: string, body: B): Observable<T> {
    return this.http.post<T>(this.buildUrl(endpoint), body, { headers: this.buildHeaders() });
  }

  postFormData<T>(endpoint: string, body: FormData): Observable<T> {
    return this.http.post<T>(this.buildUrl(endpoint), body, { headers: this.buildHeaders() });
  }

  put<T, B = unknown>(endpoint: string, body: B): Observable<T> {
    return this.http.put<T>(this.buildUrl(endpoint), body, { headers: this.buildHeaders() });
  }

  patch<T, B = unknown>(endpoint: string, body: B): Observable<T> {
    return this.http.patch<T>(this.buildUrl(endpoint), body, { headers: this.buildHeaders() });
  }

  delete<T>(endpoint: string): Observable<T> {
    return this.http.delete<T>(this.buildUrl(endpoint), { headers: this.buildHeaders() });
  }

  private buildUrl(endpoint: string): string {
    const cleanedEndpoint = endpoint.replace(/^\/+/, '');
    return `${this.apiUrl}/${cleanedEndpoint}`;
  }

  private toHttpParams(
    params?: HttpParams | Record<string, string | number | boolean>
  ): HttpParams | undefined {
    if (!params) {
      return undefined;
    }

    if (params instanceof HttpParams) {
      return params;
    }

    let httpParams = new HttpParams();
    for (const key of Object.keys(params)) {
      httpParams = httpParams.set(key, String(params[key]));
    }
    return httpParams;
  }

  private buildHeaders(): HttpHeaders {
    const authorizationHeader = getAuthorizationHeader();
    if (!authorizationHeader) {
      return new HttpHeaders();
    }

    return new HttpHeaders({
      Authorization: authorizationHeader,
    });
  }
}
