const fs = require('fs');
const { Pool } = require('pg');
require('dotenv').config();

// SSL certificate
const sslConfig = {
  rejectUnauthorized: true,
  ca: `-----BEGIN CERTIFICATE-----
MIIEUDCCArigAwIBAgIUfx+mFjZ7SJ5D9UY2wivkY32TQeowDQYJKoZIhvcNAQEM
BQAwQDE+MDwGA1UEAww1YjY4MDNkNzEtYjkyMy00NWU3LWIxN2MtYTM4ZDAxM2Vi
ZGE1IEdFTiAxIFByb2plY3QgQ0EwHhcNMjUwNzE2MTUxMzMyWhcNMzUwNzE0MTUx
MzMyWjBAMT4wPAYDVQQDDDViNjgwM2Q3MS1iOTIzLTQ1ZTctYjE3Yy1hMzhkMDEz
ZWJkYTUgR0VOIDEgUHJvamVjdCBDQTCCAaIwDQYJKoZIhvcNAQEBBQADggGPADCC
AYoCggGBAIZMIiPzA22biTphMFYKTWLmfbeldGy8l5iyahPJJFY53sr9POpVP1Wg
trS5QyAIqm1tCH2jTIewAKGgcPOa5cHJFZGTo46c+1d7841AcdP1BbJ89Mg0U/J8
VnyqJt5v845rbVIgl4Ghla5n6SGE2Uyg0yGJLRiXJLInSdF8ejNMXAGg0NTHzlGW
cpuWrsa56l8nNMoQh3oTmtzvlVvgnLvdbwOkv4oGYPj9CWaXQ8ZlR5z5AoKyH/yQ
Pluy6FE0h7Crsy9FtimrEQE9RuMFQFAlIRNgfSGKNjEYn/QxYsf3FoQp0uqabMas
EP1xJwr8qIDkT2TRdHIjBcNhgMO8YfXvkgJ/AdrRzGDfidfVsjX2w7rCK+cQDkGJ
Gzeh2IdxBJAd4u8qNCTr3FN2ggv1Taf/iJDRwDRfDCzrgvi+HtCPrvFVPX+AD9po
CFJc/8kHGX9hdyOecfHJDkPxe4BEFxbCfdLA0SR/NIUwM1pBwmq2T2AbGGaYIc+A
MCBRc7Vo0QIDAQABo0IwQDAdBgNVHQ4EFgQUP1V5R1hsevDbLaMb0hlj7jJtJ7Mw
EgYDVR0TAQH/BAgwBgEB/wIBADALBgNVHQ8EBAMCAQYwDQYJKoZIhvcNAQEMBQAD
ggGBAEzjh7RjcN63BnJxSoRBxY+ugd6+KWshb+4t9izgPrlJ/qMWekbEvOx8qtYR
FGm9PwUUsNnjnuf0zyigjwJgcX5yS40wbsQ2t3ZGDD2MoQQTTsQVnbp7Ynahpjuz
8OD+pxkbuShN8G7Bzr6AhNmqbb220kt326Aae2mW0H24Y2BOqj3VB8t06+kp+82V
Zo2Q5G097I94pCZ8ZvkH1Lcdt9yJZFAPe2SzSPN8txJd5UiNMmBok2hpEwyBhOd6
uA8wswsXmL7VMqzvKeHM1/ZxmPKSN5H44gVqsFkptLzKTggEzLc8uVdbEWzARm4s
MWcsBiXBWUUhoFkYtG1u1MroP1rTJZ1MqJNRapdx6Mv1TVV6VydlzBxVH07bZW/Z
Az5BT6/GESHojXivhI+5LqMoFMRNoH52ZD1UB88y3Sv60YKofICOkehckfEvqC0y
citumPU3BjznfkqlNJHv+Y7dHhVoBtr/v3Esz1I5Y08W7Buq1b3sA2crR5dJDxt6
23QfoA==
-----END CERTIFICATE-----`,
};

// PostgreSQL Pool configuration with SSL
const pool = new Pool({
  host: process.env.DB_HOST || 'pg-f24ca1b-juinpiyada1-db52.e.aivencloud.com',
  port: parseInt(process.env.DB_PORT || '10005', 10),
  user: process.env.DB_USER || 'avnadmin',
  password: process.env.DB_PASS || 'AVNS_02ltDOcBtt0byI5MRf0',
  database: process.env.DB_NAME || 'defaultdb',
  max: parseInt(process.env.DB_CONN_LIMIT || '10', 10),
  idleTimeoutMillis: 30000,
  ssl: sslConfig,  // Add SSL configuration here
});

(async () => {
  try {
    const client = await pool.connect();
    console.log('PostgreSQL Connected');
    client.release();
  } catch (err) {
    console.error('PostgreSQL connection error:', err);
    process.exit(1);
  }
})();

module.exports = pool;  // Export pool for use in other parts of the app
