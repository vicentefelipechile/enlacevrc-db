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

// =================================================================================================
// Type Definitions (basadas en models.ts)
// =================================================================================================

/**
 * @typedef {Object} SettingType
 * @property {number} setting_type_id - ID único del tipo de configuración
 * @property {string} type_name - Nombre del tipo
 * @property {string} [description] - Descripción opcional del tipo
 * @property {Date} created_at - Fecha de creación
 * @property {string} created_by - Usuario que creó el tipo
 * @property {Date} updated_at - Fecha de última actualización
 */

/**
 * @typedef {Object} VerificationType
 * @property {number} verification_type_id - ID único del tipo de verificación
 * @property {string} type_name - Nombre del tipo de verificación
 * @property {string} [description] - Descripción opcional del tipo
 * @property {Date} created_at - Fecha de creación
 * @property {string} created_by - Usuario que creó el tipo
 * @property {Date} updated_at - Fecha de última actualización
 * @property {boolean} is_disabled - Indica si está deshabilitado
 */

/**
 * @typedef {Object} Setting
 * @property {number} setting_id - ID único de la configuración
 * @property {string} setting_name - Nombre de la configuración
 * @property {number} setting_type_id - ID del tipo de configuración
 * @property {string} default_value - Valor por defecto
 * @property {Date} created_at - Fecha de creación
 * @property {string} created_by - Usuario que creó la configuración
 * @property {Date} updated_at - Fecha de última actualización
 * @property {boolean} is_disabled - Indica si está deshabilitado
 */

/**
 * @typedef {Object} LogLevel
 * @property {number} log_level_id - ID único del nivel de log
 * @property {string} level_name - Nombre del nivel
 * @property {string} description - Descripción del nivel
 * @property {Date} created_at - Fecha de creación
 * @property {string} created_by - Usuario que creó el nivel
 * @property {Date} updated_at - Fecha de última actualización
 */

/**
 * @typedef {Object} Log
 * @property {number} log_id - ID único del log
 * @property {number} log_level_id - ID del nivel de log
 * @property {string} log_message - Mensaje del log
 * @property {Date} created_at - Fecha de creación
 * @property {string} created_by - Usuario que creó el log
 */

/**
 * @typedef {Object} DiscordServer
 * @property {string} discord_server_id - ID del servidor de Discord
 * @property {string} server_name - Nombre del servidor
 * @property {Date} added_at - Fecha en que se agregó
 * @property {string} added_by - Usuario que agregó el servidor
 */

/**
 * @typedef {Object} BotAdmin
 * @property {string} discord_id - ID de Discord del administrador
 * @property {Date} added_at - Fecha en que se agregó
 * @property {string} added_by - Usuario que agregó el administrador
 */

/**
 * @typedef {Object} Staff
 * @property {string} discord_id - ID de Discord del staff
 * @property {string} [discord_name] - Nombre de Discord del staff
 * @property {Date} added_at - Fecha en que se agregó
 * @property {string} added_by - Usuario que agregó el staff
 */

/**
 * @typedef {Object} Profile
 * @property {string} discord_id - ID de Discord del usuario
 * @property {string} vrchat_id - ID de VRChat del usuario
 * @property {string} vrchat_name - Nombre de VRChat del usuario
 * @property {Date} added_at - Fecha de creación del perfil
 * @property {Date} updated_at - Fecha de última actualización
 * @property {string} created_by - Usuario que creó el perfil
 * @property {string} [updated_by] - Usuario que actualizó el perfil
 * @property {boolean|number} is_banned - Indica si el usuario está baneado
 * @property {Date} [banned_at] - Fecha del baneo
 * @property {string} [banned_reason] - Razón del baneo
 * @property {string} [banned_by] - Usuario que realizó el baneo
 * @property {boolean|number} is_verified - Indica si el usuario está verificado
 * @property {number} verification_id - ID del método de verificación
 * @property {Date} [verified_at] - Fecha de verificación
 * @property {string} [verified_from] - Servidor desde donde se verificó
 * @property {string} [verified_by] - Usuario que realizó la verificación
 */

/**
 * @typedef {Object} DiscordSetting
 * @property {number} discord_setting_id - ID único de la configuración
 * @property {string} discord_server_id - ID del servidor de Discord
 * @property {string} setting_key - Clave de la configuración
 * @property {string} setting_value - Valor de la configuración
 * @property {Date} created_at - Fecha de creación
 * @property {Date} updated_at - Fecha de última actualización
 * @property {string} updated_by - Usuario que actualizó la configuración
 */

/**
 * @typedef {Object} VRChatGroup
 * @property {string} vrchat_group_id - ID del grupo de VRChat
 * @property {string} discord_server_id - ID del servidor de Discord asociado
 * @property {string} group_name - Nombre del grupo
 * @property {Date} added_at - Fecha en que se agregó
 * @property {string} added_by - Usuario que agregó el grupo
 */

/**
 * @typedef {Object} UserRequestData
 * @property {string} discord_id - Discord ID del usuario que realiza la petición
 * @property {string} discord_name - Nombre de Discord del usuario que realiza la petición
 */

/**
 * @typedef {Object} DeleteGroupResponse
 * @property {boolean} success - Indica si la petición fue exitosa
 * @property {string} message - Mensaje de la petición
 * @property {Object} data - Datos de la petición
 * @property {number} data.vrchat_group_id - ID del grupo de VRChat
 * @property {string} data.group_name - Nombre del grupo
 */

/**
 * @typedef {Object} LogGroupResponse
 * @property {boolean} success - Indica si la petición fue exitosa
 * @property {string} message - Mensaje de la petición
 * @property {Object} data - Datos de la petición
 * @property {number} data.log_id - ID único del log
 * @property {string} data.vrchat_group_id - ID del grupo de VRChat
 * @property {string} data.discord_server_id - ID del servidor de Discord asociado
 * @property {string} data.action_description - Descripción de la acción
 */

/**
 * @typedef {Object} AddGroupResponse
 * @property {boolean} success - Indica si la petición fue exitosa
 * @property {string} message - Mensaje de la petición
 * @property {Object} data - Datos de la petición
 * @property {string} data.vrchat_group_id - ID del grupo de VRChat
 * @property {string} data.discord_server_id - ID del servidor de Discord asociado
 * @property {string} data.group_name - Nombre del grupo
 * @property {number} data.log_id - ID del log
 */


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
        discordConfig: HOUR * 2,
        // 1 hora
        group: HOUR
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
     * @param {UserRequestData} userRequestData - Datos del usuario que realiza la petición
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
     * @param {UserRequestData} userRequestData - Datos del usuario que realiza la petición
     * @param {Object} profileData - Datos del perfil
     * @param {string} profileData.vrchat_id - ID de VRChat del usuario
     * @param {string} profileData.discord_id - ID de Discord del usuario
     * @param {string} profileData.vrchat_name - Nombre de VRChat del usuario
     * @returns {Promise<{success: boolean, message: string}>} Respuesta del servidor
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
     * @param {UserRequestData} userRequestData - Datos del usuario que realiza la petición
     * @param {string} profileId - ID del perfil (VRChat ID o Discord ID)
     * @param {boolean} [useCache=true] - Usar caché
     * @returns {Promise<Profile>} Datos del perfil
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
     * @param {UserRequestData} userRequestData - Datos del usuario que realiza la petición
     * @param {Object} [filters={}] - Filtros opcionales
     * @param {number} [filters.limit] - Límite de resultados
     * @param {string} [filters.start_date] - Fecha de inicio (YYYY-MM-DD)
     * @param {string} [filters.end_date] - Fecha de fin (YYYY-MM-DD)
     * @param {string} [filters.created_by] - ID del creador
     * @returns {Promise<Profile[]>} Lista de perfiles
     */
    static async listProfiles(userRequestData, filters = {}) {
        const params = new URLSearchParams(filters);
        const queryString = params.toString() ? `?${params.toString()}` : '';

        const response = await D1Class._request(`/profile/list${queryString}`, userRequestData);
        return response.data;
    }

    /**
     * Elimina un perfil
     * @param {UserRequestData} userRequestData - Datos del usuario que realiza la petición
     * @param {string} profileId - ID del perfil (VRChat ID o Discord ID)
     * @returns {Promise<{success: boolean, message: string}>} Respuesta del servidor
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
     * @param {UserRequestData} userRequestData - Datos del usuario que realiza la petición
     * @param {string} profileId - ID del perfil (VRChat ID o Discord ID)
     * @param {string} bannedReason - Razón del baneo
     * @returns {Promise<{success: boolean, message: string}>} Respuesta del servidor
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
     * @param {UserRequestData} userRequestData - Datos del usuario que realiza la petición
     * @param {string} profileId - ID del perfil (VRChat ID o Discord ID)
     * @returns {Promise<{success: boolean, message: string}>} Respuesta del servidor
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
     * @param {UserRequestData} userRequestData - Datos del usuario que realiza la petición
     * @param {string} profileId - ID del perfil (VRChat ID o Discord ID)
     * @param {Object} verificationData - Datos de verificación
     * @param {number} verificationData.verification_id - ID del método de verificación
     * @param {string} verificationData.verified_from - ID del servidor de Discord
     * @returns {Promise<{success: boolean, message: string}>} Respuesta del servidor
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
     * @param {UserRequestData} userRequestData - Datos del usuario que realiza la petición
     * @param {string} profileId - ID del perfil (VRChat ID o Discord ID)
     * @returns {Promise<{success: boolean, message: string}>} Respuesta del servidor
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
     * @param {UserRequestData} userRequestData - Datos del usuario que realiza la petición
     * @param {Object} staffData - Datos del staff
     * @param {string} staffData.discord_id - ID de Discord del staff
     * @param {string} staffData.discord_name - Nombre de Discord del staff
     * @returns {Promise<{success: boolean, message: string}>} Respuesta del servidor
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
     * @param {UserRequestData} userRequestData - Datos del usuario que realiza la petición
     * @param {string} staffId - Discord ID del staff
     * @param {boolean} [useCache=true] - Usar caché
     * @returns {Promise<Staff>} Datos del staff
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
     * @param {UserRequestData} userRequestData - Datos del usuario que realiza la petición
     * @param {boolean} [useCache=true] - Usar caché
     * @returns {Promise<Staff[]>} Lista de staff
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
     * @param {UserRequestData} userRequestData - Datos del usuario que realiza la petición
     * @param {string} staffId - Discord ID del staff
     * @param {string} newName - Nuevo nombre
     * @returns {Promise<{success: boolean, message: string}>} Respuesta del servidor
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
     * @param {UserRequestData} userRequestData - Datos del usuario que realiza la petición
     * @param {string} staffId - Discord ID del staff
     * @returns {Promise<{success: boolean, message: string}>} Respuesta del servidor
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
     * Agrega un nuevo servidor de Discord y puebla automáticamente todas las configuraciones existentes
     * @param {UserRequestData} userRequestData - Datos del usuario que realiza la petición
     * @param {string} discordServerId - ID del servidor de Discord a agregar
     * @param {string} serverName - Nombre del servidor de Discord
     * @returns {Promise<{success: boolean, message: string, settings_added: number}>} Respuesta del servidor con información de configuraciones añadidas
     */
    static async addDiscordServer(userRequestData, discordServerId, serverName) {
        const response = await D1Class._request('/discord/add-server', userRequestData, {
            method: 'POST',
            body: JSON.stringify({
                discord_server_id: discordServerId,
                server_name: serverName
            })
        });

        D1Class._invalidateCache(`discord:${discordServerId}`);
        return response;
    }

    /**
     * Obtiene una configuración específica de Discord
     * @param {UserRequestData} userRequestData - Datos del usuario que realiza la petición
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
                const response = await D1Class._request(`/discord/${serverId}/get-setting?setting_key=${settingKey}`, userRequestData);
                return response.data[settingKey];
            },
            D1Class.ttls.discordConfig
        );
    }

    /**
     * Obtiene todas las configuraciones de un servidor de Discord
     * @param {UserRequestData} userRequestData - Datos del usuario que realiza la petición
     * @param {string} serverId - ID del servidor de Discord
     * @param {boolean} [useCache=true] - Usar caché
     * @returns {Promise<Record<string, string>>} Todas las configuraciones del servidor (objeto con claves y valores como strings)
     */
    static async getAllDiscordSettings(userRequestData, serverId, useCache = true) {
        const cacheKey = `discord:${serverId}:all`;

        if (!useCache) {
            D1Class.cache.del(cacheKey);
        }

        return D1Class._getCached(
            cacheKey,
            async () => {
                const response = await D1Class._request(`/discord/${serverId}/get-setting?getallsettings=true`, userRequestData);
                return response.data;
            },
            D1Class.ttls.discordConfig
        );
    }

    /**
     * Lista todas las configuraciones de Discord
     * @param {UserRequestData} userRequestData - Datos del usuario que realiza la petición
     * @param {string} serverId - ID del servidor de Discord
     * @returns {Promise<DiscordSetting[]>} Lista de configuraciones
     */
    static async listDiscordSettings(userRequestData, serverId) {
        const response = await D1Class._request(`/discord/${serverId}/list-settings`, userRequestData);
        return response.data;
    }

    /**
     * Actualiza una configuración de Discord
     * @param {UserRequestData} userRequestData - Datos del usuario que realiza la petición
     * @param {string} serverId - ID del servidor de Discord
     * @param {string} settingKey - Clave de la configuración
     * @param {string} settingValue - Nuevo valor de la configuración
     * @returns {Promise<{success: boolean, message: string}>} Respuesta del servidor
     */
    static async updateDiscordSetting(userRequestData, serverId, settingKey, settingValue) {
        const response = await D1Class._request(`/discord/${serverId}/update-setting`, userRequestData, {
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
     * Crea una nueva configuración de Discord
     * @param {UserRequestData} userRequestData - Datos del usuario que realiza la petición
     * @param {string} settingKey - Clave de la configuración
     * @param {string} settingType - Tipo de la configuración
     * @param {string} defaultValue - Valor por defecto de la configuración
     * @returns {Promise<{success: boolean, message: string}>} Respuesta del servidor
     */
    static async newDiscordSetting(userRequestData, settingKey, settingType, defaultValue) {
        const response = await D1Class._request(`/discord/new-setting`, userRequestData, {
            method: 'POST',
            body: JSON.stringify({
                setting_key: settingKey,
                setting_type: settingType,
                default_value: defaultValue
            })
        });

        D1Class._invalidateCache(`discord:${serverId}`);
        return response;
    }

    /**
     * Verifica si un servidor de Discord existe
     * @param {UserRequestData} userRequestData - Datos del usuario que realiza la petición
     * @param {string} serverId - ID del servidor de Discord
     * @returns {Promise<boolean>} True si el servidor existe
     */
    static async discordServerExists(userRequestData, serverId) {
        const response = await D1Class._request(`/discord/${serverId}/exists-server`, userRequestData);
        return response.data.exists;
    }

    /**
     * Lista todos los servidores de Discord
     * @param {UserRequestData} userRequestData - Datos del usuario que realiza la petición
     * @returns {Promise<DiscordServer[]>} Array de servidores con discord_server_id y discord_server_name
     */
    static async listDiscordServers(userRequestData) {
        const response = await D1Class._request('/discord/list-servers', userRequestData);
        return response.data;
    }

    // =================================================================================================
    // VRChat Group Methods
    // =================================================================================================

    /**
     * Añade un nuevo grupo de VRChat a un servidor de Discord
     * @param {UserRequestData} userRequestData - Datos del usuario que realiza la petición
     * @param {string} vrchatGroupId - ID del grupo de VRChat
     * @param {string} discordServerId - ID del servidor de Discord
     * @param {string} groupName - Nombre del grupo
     * @returns {Promise<AddGroupResponse>} Respuesta del servidor
     */
    static async addVRChatGroup(userRequestData, vrchatGroupId, discordServerId, groupName) {
        const response = await D1Class._request('/group/add-group', userRequestData, {
            method: 'POST',
            body: JSON.stringify({
                vrchat_group_id: vrchatGroupId,
                discord_server_id: discordServerId,
                group_name: groupName
            })
        });

        D1Class._invalidateCache(`group:${vrchatGroupId}`);
        D1Class._invalidateCache(`discord:${discordServerId}:groups`);
        return response;
    }

    /**
     * Lista todos los grupos de VRChat de un servidor de Discord
     * @param {UserRequestData} userRequestData - Datos del usuario que realiza la petición
     * @param {string} serverId - ID del servidor de Discord
     * @param {boolean} [useCache=true] - Usar caché
     * @returns {Promise<VRChatGroup[]>} Lista de grupos del servidor
     */
    static async listVRChatGroups(userRequestData, serverId, useCache = true) {
        const cacheKey = `discord:${serverId}:groups`;

        if (!useCache) {
            D1Class.cache.del(cacheKey);
        }

        return D1Class._getCached(
            cacheKey,
            async () => {
                const response = await D1Class._request(`/discord/${serverId}/list-groups`, userRequestData);
                return response.data.groups;
            },
            D1Class.ttls.group
        );
    }

    /**
     * Obtiene información de un grupo de VRChat
     * @param {UserRequestData} userRequestData - Datos del usuario que realiza la petición
     * @param {string} groupId - ID del grupo de VRChat
     * @param {boolean} [useCache=true] - Usar caché
     * @returns {Promise<VRChatGroup>} Datos del grupo
     */
    static async getVRChatGroup(userRequestData, groupId, useCache = true) {
        const cacheKey = `group:${groupId}`;

        if (!useCache) {
            D1Class.cache.del(cacheKey);
        }

        return D1Class._getCached(
            cacheKey,
            async () => {
                const response = await D1Class._request(`/group/${groupId}/get-group`, userRequestData);
                return response.data;
            },
            D1Class.ttls.group
        );
    }

    /**
     * Obtiene el servidor de Discord al que pertenece un grupo de VRChat
     * @param {UserRequestData} userRequestData - Datos del usuario que realiza la petición
     * @param {string} groupId - ID del grupo de VRChat
     * @param {boolean} [useCache=true] - Usar caché
     * @returns {Promise<DiscordServer>} Datos del servidor Discord
     */
    static async getVRChatGroupServer(userRequestData, groupId, useCache = true) {
        const cacheKey = `group:${groupId}:server`;

        if (!useCache) {
            D1Class.cache.del(cacheKey);
        }

        return D1Class._getCached(
            cacheKey,
            async () => {
                const response = await D1Class._request(`/group/${groupId}/get-server`, userRequestData);
                return response.data;
            },
            D1Class.ttls.group
        );
    }

    /**
     * Actualiza el nombre de un grupo de VRChat
     * @param {UserRequestData} userRequestData - Datos del usuario que realiza la petición
     * @param {string} groupId - ID del grupo de VRChat
     * @param {string} newName - Nuevo nombre del grupo
     * @returns {Promise<{success: boolean, message: string}>} Respuesta del servidor
     */
    static async updateVRChatGroup(userRequestData, groupId, newName) {
        const response = await D1Class._request(`/group/${groupId}/update-group`, userRequestData, {
            method: 'PUT',
            body: JSON.stringify({ group_name: newName })
        });

        D1Class.cache.del(`group:${groupId}`);
        D1Class.cache.del(`group:${groupId}:server`);
        return response;
    }

    /**
     * Elimina un grupo de VRChat
     * @param {UserRequestData} userRequestData - Datos del usuario que realiza la petición
     * @param {string} groupId - ID del grupo de VRChat
     * @returns {Promise<{success: boolean, message: string}>} Respuesta del servidor
     */
    static async deleteVRChatGroup(userRequestData, groupId) {
        const response = await D1Class._request(`/group/${groupId}/delete-group`, userRequestData, {
            method: 'DELETE'
        });

        D1Class._invalidateCache(`group:${groupId}`);
        return response;
    }

    /**
     * Crea una entrada de log para un grupo de VRChat existente
     * @param {UserRequestData} userRequestData - Datos del usuario que realiza la petición
     * @param {string} vrchatGroupId - ID del grupo de VRChat
     * @param {string} discordServerId - ID del servidor de Discord
     * @param {string} actionDescription - Descripción de la acción registrada
     * @returns {Promise<LogGroupResponse>} Respuesta del servidor con el log_id generado
     */
    static async logVRChatGroup(userRequestData, vrchatGroupId, discordServerId, actionDescription) {
        const response = await D1Class._request('/group/log-group', userRequestData, {
            method: 'POST',
            body: JSON.stringify({
                vrchat_group_id: vrchatGroupId,
                discord_server_id: discordServerId,
                action_description: actionDescription
            })
        });

        return response;
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
     * Limpia la caché de grupos de VRChat
     */
    static clearGroupCache() {
        D1Class._invalidateCache('group:');
    }

    /**
     * Obtiene estadísticas de caché
     * @returns {{keys: number, hits: number, misses: number, ksize: number, vsize: number}} Estadísticas de caché
     */
    static getCacheStats() {
        return D1Class.cache.getStats();
    }
}

module.exports = { D1Class };