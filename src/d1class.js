/**
 * @license MIT
 * @file src/d1class.js
 * @author vicentefelipechile
 * @description Cliente API para EnlaceVRC Database utilizando node-cache.
 * Proporciona una interfaz para interactuar con la base de datos mediante caché
 * y peticiones HTTP autenticadas. Soporta operaciones CRUD para perfiles, staff y configuraciones de Discord.
 */

const NodeCache = require('node-cache');

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;


/**
 * D1Class - Client para interactuar con la API de EnlaceVRC
 * 
 * Proporciona métodos para gestionar perfiles de usuarios, staff y configuraciones de Discord
 * con soporte de caché automático para optimizar las peticiones al servidor.
 * 
 * @class D1Class
 * @example
 * // Inicializar la clase
 * D1Class.init({
 *   apiKey: 'tu-api-key'
 * });
 * 
 * // Definir datos del usuario que realiza la petición
 * const user_request_data = {
 *   discord_id: '123456789',
 *   discord_name: 'Usuario#1234'
 * };
 * 
 * // Obtener un perfil
 * const profile = await D1Class.getProfile(user_request_data, 'usr_12345678');
 * 
 * // Crear un staff
 * await D1Class.createStaff(user_request_data, {
 *   discord_id: '987654321',
 *   discord_name: 'Staff#5678'
 * });
 * 
 * // Obtener configuración de Discord
 * const setting = await D1Class.getDiscordSetting(user_request_data, 'server_id', 'role_verified');
 */
class D1Class {
    // Configuración estática de la clase
    static baseEndPoint = 'https://enlacevrc-db.vicentefelipechile.workers.dev/';
    static apiKey = null;

    // Cache inicial
    static cache = new NodeCache({ stdTTL: 3600, checkperiod: 120 });

    // TTLs específicos para diferentes tipos de datos
    static ttls = {
        // 5 minutos
        profile: MINUTE * 5,
        // 30 minutos
        staff: MINUTE * 30,
        // 2 horas
        discordConfig: HOUR * 2
    };

    /**
     * Configuración inicial de la clase
     * @param {Object} config - Configuración de inicialización
     * @param {string} config.apiKey - API Key para autenticación
     * @param {string} [config.baseEndPoint] - URL base del API (opcional)
     * @param {boolean} [config.force=false] - Forzar reinicialización
     */
    static init({ apiKey, baseEndPoint, force = false }) {
        if (D1Class.apiKey && !force) {
            throw new Error('D1Class ya ha sido inicializado. Usa la opción force para reinicializar.');
        }

        D1Class.cache.flushAll();
        D1Class.apiKey = apiKey;

        if (baseEndPoint) {
            D1Class.baseEndPoint = baseEndPoint;
        }
    }

    // =================================================================================================
    // Helper Methods
    // =================================================================================================

    /**
     * Realiza una petición HTTP al API
     * @private
     * @param {string} endpoint - Endpoint relativo
     * @param {Object} userRequestData - Datos del usuario que realiza la petición
     * @param {string} userRequestData.discord_id - Discord ID del usuario
     * @param {string} userRequestData.discord_name - Nombre de Discord del usuario
     * @param {Object} options - Opciones de fetch
     * @returns {Promise<Object>} Respuesta JSON del servidor
     */
    static async _request(endpoint, userRequestData, options = {}) {
        if (!D1Class.apiKey) {
            throw new Error('D1Class no ha sido inicializado. Llama a D1Class.init() primero.');
        }

        if (!userRequestData || !userRequestData.discord_id || !userRequestData.discord_name) {
            throw new Error('user_request_data debe contener discord_id y discord_name');
        }

        const url = `${D1Class.baseEndPoint}${endpoint}`;
        const headers = {
            'Authorization': `Bearer ${D1Class.apiKey}`,
            'X-Discord-ID': userRequestData.discord_id,
            'X-Discord-Name': userRequestData.discord_name,
            'Content-Type': 'application/json',
            ...options.headers
        };

        const response = await fetch(url, {
            ...options,
            headers
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || `HTTP ${response.status}: ${response.statusText}`);
        }

        return data;
    }

    /**
     * Obtiene un valor de caché o ejecuta una función para obtenerlo
     * @private
     * @param {string} key - Clave de caché
     * @param {Function} fetchFn - Función para obtener el valor
     * @param {number} ttl - Tiempo de vida en segundos
     * @returns {Promise<any>} Valor cacheado o recién obtenido
     */
    static async _getCached(key, fetchFn, ttl) {
        const cached = D1Class.cache.get(key);
        if (cached !== undefined) {
            return cached;
        }

        const value = await fetchFn();
        D1Class.cache.set(key, value, ttl / 1000);
        return value;
    }

    /**
     * Invalida entradas de caché que coincidan con un patrón
     * @private
     * @param {string} pattern - Patrón a buscar en las claves
     */
    static _invalidateCache(pattern) {
        const keys = D1Class.cache.keys();
        keys.forEach(key => {
            if (key.includes(pattern)) {
                D1Class.cache.del(key);
            }
        });
    }

    // =================================================================================================
    // Profile Methods
    // =================================================================================================

    /**
     * Crea un nuevo perfil de usuario
     * @param {Object} userRequestData - Datos del usuario que realiza la petición
     * @param {string} userRequestData.discord_id - Discord ID del usuario
     * @param {string} userRequestData.discord_name - Nombre de Discord del usuario
     * @param {Object} profileData - Datos del perfil
     * @param {string} profileData.vrchat_id - ID de VRChat del usuario
     * @param {string} profileData.discord_id - ID de Discord del usuario
     * @param {string} profileData.vrchat_name - Nombre de VRChat del usuario
     * @returns {Promise<Object>} Respuesta del servidor
     */
    static async createProfile(userRequestData, profileData) {
        const response = await D1Class._request('/profile/new', userRequestData, {
            method: 'POST',
            body: JSON.stringify(profileData)
        });

        D1Class._invalidateCache('profile:');
        return response;
    }

    /**
     * Obtiene un perfil por su ID (VRChat ID o Discord ID)
     * @param {Object} userRequestData - Datos del usuario que realiza la petición
     * @param {string} userRequestData.discord_id - Discord ID del usuario
     * @param {string} userRequestData.discord_name - Nombre de Discord del usuario
     * @param {string} profileId - ID del perfil (VRChat ID o Discord ID)
     * @param {boolean} [useCache=true] - Usar caché
     * @returns {Promise<Object>} Datos del perfil
     */
    static async getProfile(userRequestData, profileId, useCache = true) {
        const cacheKey = `profile:${profileId}`;

        if (!useCache) {
            D1Class.cache.del(cacheKey);
        }

        return D1Class._getCached(
            cacheKey,
            async () => {
                const response = await D1Class._request(`/profile/${profileId}/get`, userRequestData);
                return response.data;
            },
            D1Class.ttls.profile
        );
    }

    /**
     * Lista todos los perfiles con filtros opcionales
     * @param {Object} userRequestData - Datos del usuario que realiza la petición
     * @param {string} userRequestData.discord_id - Discord ID del usuario
     * @param {string} userRequestData.discord_name - Nombre de Discord del usuario
     * @param {Object} [filters={}] - Filtros opcionales
     * @param {number} [filters.limit] - Límite de resultados
     * @param {string} [filters.start_date] - Fecha de inicio (YYYY-MM-DD)
     * @param {string} [filters.end_date] - Fecha de fin (YYYY-MM-DD)
     * @param {string} [filters.created_by] - ID del creador
     * @returns {Promise<Array>} Lista de perfiles
     */
    static async listProfiles(userRequestData, filters = {}) {
        const params = new URLSearchParams(filters);
        const queryString = params.toString() ? `?${params.toString()}` : '';

        const response = await D1Class._request(`/profile/list${queryString}`, userRequestData);
        return response.data;
    }

    /**
     * Elimina un perfil
     * @param {Object} userRequestData - Datos del usuario que realiza la petición
     * @param {string} userRequestData.discord_id - Discord ID del usuario
     * @param {string} userRequestData.discord_name - Nombre de Discord del usuario
     * @param {string} profileId - ID del perfil (VRChat ID o Discord ID)
     * @returns {Promise<Object>} Respuesta del servidor
     */
    static async deleteProfile(userRequestData, profileId) {
        const response = await D1Class._request(`/profile/${profileId}/delete`, userRequestData, {
            method: 'DELETE'
        });

        D1Class._invalidateCache('profile:');
        return response;
    }

    /**
     * Banea un perfil
     * @param {Object} userRequestData - Datos del usuario que realiza la petición
     * @param {string} userRequestData.discord_id - Discord ID del usuario
     * @param {string} userRequestData.discord_name - Nombre de Discord del usuario
     * @param {string} profileId - ID del perfil (VRChat ID o Discord ID)
     * @param {string} bannedReason - Razón del baneo
     * @returns {Promise<Object>} Respuesta del servidor
     */
    static async banProfile(userRequestData, profileId, bannedReason) {
        const response = await D1Class._request(`/profile/${profileId}/ban`, userRequestData, {
            method: 'PUT',
            body: JSON.stringify({ banned_reason: bannedReason })
        });

        D1Class.cache.del(`profile:${profileId}`);
        return response;
    }

    /**
     * Desbanea un perfil
     * @param {Object} userRequestData - Datos del usuario que realiza la petición
     * @param {string} userRequestData.discord_id - Discord ID del usuario
     * @param {string} userRequestData.discord_name - Nombre de Discord del usuario
     * @param {string} profileId - ID del perfil (VRChat ID o Discord ID)
     * @returns {Promise<Object>} Respuesta del servidor
     */
    static async unbanProfile(userRequestData, profileId) {
        const response = await D1Class._request(`/profile/${profileId}/unban`, userRequestData, {
            method: 'PUT'
        });

        D1Class.cache.del(`profile:${profileId}`);
        return response;
    }

    /**
     * Verifica un perfil
     * @param {Object} userRequestData - Datos del usuario que realiza la petición
     * @param {string} userRequestData.discord_id - Discord ID del usuario
     * @param {string} userRequestData.discord_name - Nombre de Discord del usuario
     * @param {string} profileId - ID del perfil (VRChat ID o Discord ID)
     * @param {Object} verificationData - Datos de verificación
     * @param {number} verificationData.verification_id - ID del método de verificación
     * @param {string} verificationData.verified_from - ID del servidor de Discord
     * @returns {Promise<Object>} Respuesta del servidor
     */
    static async verifyProfile(userRequestData, profileId, verificationData) {
        const response = await D1Class._request(`/profile/${profileId}/verify`, userRequestData, {
            method: 'PUT',
            body: JSON.stringify(verificationData)
        });

        D1Class.cache.del(`profile:${profileId}`);
        return response;
    }

    /**
     * Desverifica un perfil
     * @param {Object} userRequestData - Datos del usuario que realiza la petición
     * @param {string} userRequestData.discord_id - Discord ID del usuario
     * @param {string} userRequestData.discord_name - Nombre de Discord del usuario
     * @param {string} profileId - ID del perfil (VRChat ID o Discord ID)
     * @returns {Promise<Object>} Respuesta del servidor
     */
    static async unverifyProfile(userRequestData, profileId) {
        const response = await D1Class._request(`/profile/${profileId}/unverify`, userRequestData, {
            method: 'PUT'
        });

        D1Class.cache.del(`profile:${profileId}`);
        return response;
    }

    // =================================================================================================
    // Staff Methods
    // =================================================================================================

    /**
     * Crea un nuevo miembro del staff
     * @param {Object} userRequestData - Datos del usuario que realiza la petición
     * @param {string} userRequestData.discord_id - Discord ID del usuario
     * @param {string} userRequestData.discord_name - Nombre de Discord del usuario
     * @param {Object} staffData - Datos del staff
     * @param {string} staffData.discord_id - ID de Discord del staff
     * @param {string} staffData.discord_name - Nombre de Discord del staff
     * @returns {Promise<Object>} Respuesta del servidor
     */
    static async createStaff(userRequestData, staffData) {
        const response = await D1Class._request('/staff/new', userRequestData, {
            method: 'POST',
            body: JSON.stringify(staffData)
        });

        D1Class._invalidateCache('staff:');
        return response;
    }

    /**
     * Obtiene información de un miembro del staff
     * @param {Object} userRequestData - Datos del usuario que realiza la petición
     * @param {string} userRequestData.discord_id - Discord ID del usuario
     * @param {string} userRequestData.discord_name - Nombre de Discord del usuario
     * @param {string} staffId - Discord ID del staff
     * @param {boolean} [useCache=true] - Usar caché
     * @returns {Promise<Object>} Datos del staff
     */
    static async getStaff(userRequestData, staffId, useCache = true) {
        const cacheKey = `staff:${staffId}`;

        if (!useCache) {
            D1Class.cache.del(cacheKey);
        }

        return D1Class._getCached(
            cacheKey,
            async () => {
                const response = await D1Class._request(`/staff/${staffId}/get`, userRequestData);
                return response.staff;
            },
            D1Class.ttls.staff
        );
    }

    /**
     * Lista todos los miembros del staff
     * @param {Object} userRequestData - Datos del usuario que realiza la petición
     * @param {string} userRequestData.discord_id - Discord ID del usuario
     * @param {string} userRequestData.discord_name - Nombre de Discord del usuario
     * @param {boolean} [useCache=true] - Usar caché
     * @returns {Promise<Array>} Lista de staff
     */
    static async listStaff(userRequestData, useCache = true) {
        const cacheKey = 'staff:list';

        if (!useCache) {
            D1Class.cache.del(cacheKey);
        }

        return D1Class._getCached(
            cacheKey,
            async () => {
                const response = await D1Class._request('/staff/list', userRequestData);
                return response.data;
            },
            D1Class.ttls.staff
        );
    }

    /**
     * Actualiza el nombre de un miembro del staff
     * @param {Object} userRequestData - Datos del usuario que realiza la petición
     * @param {string} userRequestData.discord_id - Discord ID del usuario
     * @param {string} userRequestData.discord_name - Nombre de Discord del usuario
     * @param {string} staffId - Discord ID del staff
     * @param {string} newName - Nuevo nombre
     * @returns {Promise<Object>} Respuesta del servidor
     */
    static async updateStaffName(userRequestData, staffId, newName) {
        const response = await D1Class._request(`/staff/${staffId}/update`, userRequestData, {
            method: 'PUT',
            body: JSON.stringify({ discord_name: newName })
        });

        D1Class.cache.del(`staff:${staffId}`);
        D1Class.cache.del('staff:list');
        return response;
    }

    /**
     * Elimina un miembro del staff
     * @param {Object} userRequestData - Datos del usuario que realiza la petición
     * @param {string} userRequestData.discord_id - Discord ID del usuario
     * @param {string} userRequestData.discord_name - Nombre de Discord del usuario
     * @param {string} staffId - Discord ID del staff
     * @returns {Promise<Object>} Respuesta del servidor
     */
    static async deleteStaff(userRequestData, staffId) {
        const response = await D1Class._request(`/staff/${staffId}/delete`, userRequestData, {
            method: 'DELETE'
        });

        D1Class._invalidateCache('staff:');
        return response;
    }

    // =================================================================================================
    // Discord Settings Methods
    // =================================================================================================

    /**
     * Crea una nueva configuración de Discord
     * @param {Object} userRequestData - Datos del usuario que realiza la petición
     * @param {string} userRequestData.discord_id - Discord ID del usuario
     * @param {string} userRequestData.discord_name - Nombre de Discord del usuario
     * @param {string} serverId - ID del servidor de Discord
     * @param {string} settingKey - Clave de la configuración
     * @param {string} settingValue - Valor de la configuración
     * @returns {Promise<Object>} Respuesta del servidor
     */
    static async createDiscordSetting(userRequestData, serverId, settingKey, settingValue) {
        const response = await D1Class._request(`/discord/${serverId}/new`, userRequestData, {
            method: 'POST',
            body: JSON.stringify({
                setting_key: settingKey,
                setting_value: settingValue
            })
        });

        D1Class._invalidateCache(`discord:${serverId}`);
        return response;
    }

    /**
     * Obtiene una configuración específica de Discord
     * @param {Object} userRequestData - Datos del usuario que realiza la petición
     * @param {string} userRequestData.discord_id - Discord ID del usuario
     * @param {string} userRequestData.discord_name - Nombre de Discord del usuario
     * @param {string} serverId - ID del servidor de Discord
     * @param {string} settingKey - Clave de la configuración
     * @param {boolean} [useCache=true] - Usar caché
     * @returns {Promise<string>} Valor de la configuración
     */
    static async getDiscordSetting(userRequestData, serverId, settingKey, useCache = true) {
        const cacheKey = `discord:${serverId}:${settingKey}`;

        if (!useCache) {
            D1Class.cache.del(cacheKey);
        }

        return D1Class._getCached(
            cacheKey,
            async () => {
                const response = await D1Class._request(`/discord/${serverId}/get?setting_key=${settingKey}`, userRequestData);
                return response.data[settingKey];
            },
            D1Class.ttls.discordConfig
        );
    }

    /**
     * Obtiene todas las configuraciones de un servidor de Discord
     * @param {Object} userRequestData - Datos del usuario que realiza la petición
     * @param {string} userRequestData.discord_id - Discord ID del usuario
     * @param {string} userRequestData.discord_name - Nombre de Discord del usuario
     * @param {string} serverId - ID del servidor de Discord
     * @param {boolean} [useCache=true] - Usar caché
     * @returns {Promise<Object>} Todas las configuraciones del servidor
     */
    static async getAllDiscordSettings(userRequestData, serverId, useCache = true) {
        const cacheKey = `discord:${serverId}:all`;

        if (!useCache) {
            D1Class.cache.del(cacheKey);
        }

        return D1Class._getCached(
            cacheKey,
            async () => {
                const response = await D1Class._request(`/discord/${serverId}/get?getallsettings=true`, userRequestData);
                return response.data;
            },
            D1Class.ttls.discordConfig
        );
    }

    /**
     * Lista todas las configuraciones de Discord
     * @param {Object} userRequestData - Datos del usuario que realiza la petición
     * @param {string} userRequestData.discord_id - Discord ID del usuario
     * @param {string} userRequestData.discord_name - Nombre de Discord del usuario
     * @returns {Promise<Array>} Lista de configuraciones
     */
    static async listDiscordSettings(userRequestData) {
        const response = await D1Class._request('/discord/list', userRequestData);
        return response.data;
    }

    /**
     * Actualiza una configuración de Discord
     * @param {Object} userRequestData - Datos del usuario que realiza la petición
     * @param {string} userRequestData.discord_id - Discord ID del usuario
     * @param {string} userRequestData.discord_name - Nombre de Discord del usuario
     * @param {string} serverId - ID del servidor de Discord
     * @param {string} settingKey - Clave de la configuración
     * @param {string} settingValue - Nuevo valor de la configuración
     * @returns {Promise<Object>} Respuesta del servidor
     */
    static async updateDiscordSetting(userRequestData, serverId, settingKey, settingValue) {
        const response = await D1Class._request(`/discord/${serverId}/update`, userRequestData, {
            method: 'PUT',
            body: JSON.stringify({
                setting_key: settingKey,
                setting_value: settingValue
            })
        });

        D1Class._invalidateCache(`discord:${serverId}`);
        return response;
    }

    /**
     * Elimina una configuración de Discord
     * @param {Object} userRequestData - Datos del usuario que realiza la petición
     * @param {string} userRequestData.discord_id - Discord ID del usuario
     * @param {string} userRequestData.discord_name - Nombre de Discord del usuario
     * @param {string} serverId - ID del servidor de Discord
     * @param {string} settingKey - Clave de la configuración a eliminar
     * @returns {Promise<Object>} Respuesta del servidor
     */
    static async deleteDiscordSetting(userRequestData, serverId, settingKey) {
        const response = await D1Class._request(`/discord/${serverId}/delete`, userRequestData, {
            method: 'DELETE',
            body: JSON.stringify({ setting_key: settingKey })
        });

        D1Class._invalidateCache(`discord:${serverId}`);
        return response;
    }

    /**
     * Verifica si un servidor de Discord existe
     * @param {Object} userRequestData - Datos del usuario que realiza la petición
     * @param {string} userRequestData.discord_id - Discord ID del usuario
     * @param {string} userRequestData.discord_name - Nombre de Discord del usuario
     * @param {string} serverId - ID del servidor de Discord
     * @returns {Promise<boolean>} True si el servidor existe
     */
    static async discordServerExists(userRequestData, serverId) {
        const response = await D1Class._request(`/discord/${serverId}/exists`, userRequestData);
        return response.data.exists;
    }

    // =================================================================================================
    // Utility Methods
    // =================================================================================================

    /**
     * Limpia toda la caché
     */
    static clearCache() {
        D1Class.cache.flushAll();
    }

    /**
     * Limpia la caché de perfiles
     */
    static clearProfileCache() {
        D1Class._invalidateCache('profile:');
    }

    /**
     * Limpia la caché de staff
     */
    static clearStaffCache() {
        D1Class._invalidateCache('staff:');
    }

    /**
     * Limpia la caché de configuraciones de Discord
     */
    static clearDiscordCache() {
        D1Class._invalidateCache('discord:');
    }

    /**
     * Obtiene estadísticas de caché
     * @returns {Object} Estadísticas de caché
     */
    static getCacheStats() {
        return D1Class.cache.getStats();
    }
}

module.exports = { D1Class };