/**
 * HU-S2.8 — Validación y Prueba de Ensamblaje
 * Suite de pruebas E2E para el servidor GraphQL ensamblado con SPLE.
 *
 * Requiere: servidor corriendo en http://localhost:4000
 * Uso:  node tests/pruebas_ensamblaje.js
 */

const BASE_URL = 'http://localhost:4000';
let token = null;
let testMateriaId = null;
let testUserId = null;
let testUserEmail = `prueba_hu28_${Date.now()}@test.com`;

// ── Utilidades ────────────────────────────────────────────────────────────
let passed = 0;
let failed = 0;
const results = [];

async function gql(query, variables = {}, auth = false) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth && token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(BASE_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify({ query, variables }),
  });
  return res.json();
}

function ok(name, cond, detail = '') {
  if (cond) {
    console.log(`  ✅ ${name}`);
    passed++;
    results.push({ name, ok: true });
  } else {
    console.log(`  ❌ ${name}${detail ? ' — ' + detail : ''}`);
    failed++;
    results.push({ name, ok: false, detail });
  }
}

// ── SUITE 1: Core Auth (@fabrica/node-core) ───────────────────────────────
async function suiteAuth() {
  console.log('\n📋 SUITE 1: Core Auth (@fabrica/node-core)');

  // 1a. Obtener roles
  const rolesRes = await gql(`{ roles { id nombre } }`);
  const roles = rolesRes.data?.roles;
  ok('query roles devuelve lista', Array.isArray(roles) && roles.length > 0);
  const rolId = roles?.[0]?.id ?? '1';

  // 1b. Registro
  const regRes = await gql(`
    mutation {
      registro(nombre: "Usuario Prueba HU28", email: "${testUserEmail}", password: "Test1234!", rolId: "${rolId}") {
        token usuario { id nombre email }
      }
    }
  `);
  const reg = regRes.data?.registro;
  ok('mutation registro', !!reg?.token && !!reg?.usuario?.id, JSON.stringify(regRes.errors));
  if (reg) { token = reg.token; testUserId = reg.usuario.id; }

  // 1c. Login exitoso
  const loginRes = await gql(`
    mutation {
      login(email: "${testUserEmail}", password: "Test1234!") {
        token usuario { id nombre rol { nombre } }
      }
    }
  `);
  const login = loginRes.data?.login;
  ok('mutation login exitoso', !!login?.token, JSON.stringify(loginRes.errors));
  if (login?.token) token = login.token;

  // 1d. Login fallido
  const failRes = await gql(`mutation { login(email: "${testUserEmail}", password: "mala") { token } }`);
  ok('mutation login fallido retorna error', !!failRes.errors?.length, 'esperaba error');

  // 1e. Query me
  const meRes = await gql(`{ me { id nombre email } }`, {}, true);
  ok('query me con token válido', !!meRes.data?.me?.id, JSON.stringify(meRes.errors));

  // 1f. Query me sin token
  const meNoAuth = await gql(`{ me { id } }`);
  ok('query me sin token retorna error', !!meNoAuth.errors?.length, 'esperaba error');
}

// ── SUITE 2: CA-016 Materias (@fabrica/academico) ─────────────────────────
async function suiteMaterias() {
  console.log('\n📚 SUITE 2: CA-016 Módulo Materias');

  // 2a. Listar materias
  const listRes = await gql(`{ materias { id codigo nombre creditos } }`, {}, true);
  ok('query materias devuelve array', Array.isArray(listRes.data?.materias), JSON.stringify(listRes.errors));

  // 2b. Crear materia
  const createRes = await gql(`
    mutation {
      crearMateria(codigo: "TEST-HU28", nombre: "Materia de Prueba HU-S2.8", creditos: 4) {
        id codigo nombre creditos
      }
    }
  `, {}, true);
  const mat = createRes.data?.crearMateria;
  ok('mutation crearMateria', !!mat?.id && mat.codigo === 'TEST-HU28', JSON.stringify(createRes.errors));
  if (mat) testMateriaId = mat.id;

  // 2c. Código duplicado debe fallar
  const dupRes = await gql(`
    mutation { crearMateria(codigo: "TEST-HU28", nombre: "Dup", creditos: 2) { id } }
  `, {}, true);
  ok('crearMateria con código duplicado retorna error', !!dupRes.errors?.length, 'esperaba error');

  // 2d. Consultar por id
  const byIdRes = await gql(`{ materia(id: "${testMateriaId}") { id codigo creditos } }`, {}, true);
  ok('query materia(id) retorna materia', byIdRes.data?.materia?.id === testMateriaId, JSON.stringify(byIdRes.errors));

  // 2e. Actualizar
  const updRes = await gql(`
    mutation {
      actualizarMateria(id: "${testMateriaId}", nombre: "Materia Actualizada HU28", creditos: 5) {
        id nombre creditos
      }
    }
  `, {}, true);
  ok('mutation actualizarMateria', updRes.data?.actualizarMateria?.creditos === 5, JSON.stringify(updRes.errors));
}

// ── SUITE 3: CA-017 Inscripciones (@fabrica/academico) ────────────────────
async function suiteInscripciones() {
  console.log('\n🎓 SUITE 3: CA-017 Módulo Inscripciones');

  // 3a. Stats
  const statsRes = await gql(`{ stats { totalUsuarios totalMaterias totalInscripciones } }`, {}, true);
  const stats = statsRes.data?.stats;
  ok('query stats devuelve contadores', Number.isInteger(stats?.totalUsuarios), JSON.stringify(statsRes.errors));
  if (stats) {
    console.log(`     Usuarios: ${stats.totalUsuarios} | Materias: ${stats.totalMaterias} | Inscripciones: ${stats.totalInscripciones}`);
  }

  // 3b. Inscribir
  const inscRes = await gql(`
    mutation {
      inscribir(estudianteId: "${testUserId}", materiaId: "${testMateriaId}") {
        id fechaInscripcion
        estudiante { nombre }
        materia { codigo nombre }
      }
    }
  `, {}, true);
  const insc = inscRes.data?.inscribir;
  ok('mutation inscribir', !!insc?.id, JSON.stringify(inscRes.errors));

  // 3c. Inscripción duplicada debe fallar
  const dupInscRes = await gql(`
    mutation { inscribir(estudianteId: "${testUserId}", materiaId: "${testMateriaId}") { id } }
  `, {}, true);
  ok('inscribir duplicado retorna error', !!dupInscRes.errors?.length, 'esperaba error');

  // 3d. Query inscripciones general
  const allInscRes = await gql(`{
    inscripciones { id fechaInscripcion estudiante { nombre } materia { codigo } }
  }`, {}, true);
  ok('query inscripciones', Array.isArray(allInscRes.data?.inscripciones), JSON.stringify(allInscRes.errors));

  // 3e. Por estudiante
  const porEstRes = await gql(`{
    inscripcionesPorEstudiante(estudianteId: "${testUserId}") { id materia { codigo } }
  }`, {}, true);
  ok('query inscripcionesPorEstudiante', Array.isArray(porEstRes.data?.inscripcionesPorEstudiante), JSON.stringify(porEstRes.errors));

  // 3f. Por materia
  const porMatRes = await gql(`{
    inscripcionesPorMateria(materiaId: "${testMateriaId}") { id estudiante { nombre } }
  }`, {}, true);
  ok('query inscripcionesPorMateria', Array.isArray(porMatRes.data?.inscripcionesPorMateria), JSON.stringify(porMatRes.errors));

  // 3g. Desinscribir
  const desinscRes = await gql(`
    mutation { desinscribir(estudianteId: "${testUserId}", materiaId: "${testMateriaId}") }
  `, {}, true);
  ok('mutation desinscribir', desinscRes.data?.desinscribir === true, JSON.stringify(desinscRes.errors));
}

// ── SUITE 4: Variabilidad del Assembler ───────────────────────────────────
async function suiteAssembler() {
  console.log('\n⚙️  SUITE 4: Variabilidad del Assembler (introspección)');

  const introRes = await gql(`{
    __schema {
      queryType { fields { name } }
      mutationType { fields { name } }
    }
  }`);
  const queryFields    = introRes.data?.__schema?.queryType?.fields?.map(f => f.name) ?? [];
  const mutationFields = introRes.data?.__schema?.mutationType?.fields?.map(f => f.name) ?? [];

  ok('CA-016 activo: query materias en schema',    queryFields.includes('materias'));
  ok('CA-016 activo: query materia(id) en schema', queryFields.includes('materia'));
  ok('CA-016 activo: mutation crearMateria',       mutationFields.includes('crearMateria'));
  ok('CA-017 activo: query inscripciones',         queryFields.includes('inscripciones'));
  ok('CA-017 activo: query stats',                 queryFields.includes('stats'));
  ok('CA-017 activo: mutation inscribir',          mutationFields.includes('inscribir'));
  ok('core: query me',                             queryFields.includes('me'));
  ok('core: query roles',                          queryFields.includes('roles'));
  ok('core: mutation login',                       mutationFields.includes('login'));
  ok('core: mutation registro',                    mutationFields.includes('registro'));
}

// ── Limpieza: eliminar materia de prueba ──────────────────────────────────
async function cleanup() {
  console.log('\n🧹 Limpieza...');
  if (testMateriaId) {
    const delRes = await gql(`mutation { eliminarMateria(id: "${testMateriaId}") }`, {}, true);
    console.log(`  Materia TEST-HU28 eliminada: ${delRes.data?.eliminarMateria}`);
  }
}

// ── Runner principal ──────────────────────────────────────────────────────
(async () => {
  console.log('═══════════════════════════════════════════════════════');
  console.log('  HU-S2.8 — Validación y Prueba de Ensamblaje SPLE');
  console.log(`  Servidor: ${BASE_URL}`);
  console.log('═══════════════════════════════════════════════════════');

  try {
    await suiteAuth();
    await suiteMaterias();
    await suiteInscripciones();
    await suiteAssembler();
    await cleanup();
  } catch (err) {
    console.error('\n💥 Error inesperado:', err.message);
  }

  console.log('\n═══════════════════════════════════════════════════════');
  console.log(`  RESULTADO: ${passed} pasadas ✅   ${failed} fallidas ❌`);
  console.log('═══════════════════════════════════════════════════════\n');
  process.exit(failed > 0 ? 1 : 0);
})();
