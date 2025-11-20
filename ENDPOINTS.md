HEADERS:
X-Api-Key: Private Key
X-Discord-ID: Discord User ID
X-Discord-Name: Discord Username

POST   /profile/new                     - Crear perfil
GET    /profile/list                    - Listar perfiles
GET    /profile/{ID}/get                - Obtener perfil
DELETE /profile/{ID}/delete             - Eliminar perfil
PUT    /profile/{ID}/ban                - Banear perfil
PUT    /profile/{ID}/unban              - Desbanear perfil
PUT    /profile/{ID}/verify             - Verificar perfil
PUT    /profile/{ID}/unverify           - Desverificar perfil

POST   /staff/new                       - Crear staff
GET    /staff/list                      - Listar staff
GET    /staff/{DISCORD_ID}/get          - Obtener staff
PUT    /staff/{DISCORD_ID}/update_name  - Actualizar nombre de staff
DELETE /staff/{DISCORD_ID}/delete       - Eliminar staff

POST   /discord/{SERVER_ID}/new         - Crear setting
GET    /discord/list                    - Listar settings
GET    /discord/{SERVER_ID}/get         - Obtener setting(s)
PUT    /discord/{SERVER_ID}/update      - Actualizar setting
DELETE /discord/{SERVER_ID}/delete      - Eliminar setting
GET    /discord/{SERVER_ID}/exists      - Verificar servidor