/**
 * Validador de Mensagens de Commit (Conventional Commits)
 * 
 * Uso: node validate_commit.js "feat(auth): add google login oauth"
 */

const commitRegex = /^(feat|fix|docs|style|refactor|test|chore)(\([a-zA-Z0-9_-]+\))?: .{5,100}$/;

const commitMsg = process.argv[2];

if (!commitMsg) {
    console.error("❌ Erro: Nenhuma mensagem de commit fornecida.");
    console.log("Uso: node validate_commit.js \"mensagem de commit\"");
    process.exit(1);
}

console.log(`Analisando mensagem: "${commitMsg}"...`);

if (commitRegex.test(commitMsg)) {
    console.log("✅ Mensagem válida de acordo com Conventional Commits!");
    process.exit(0);
} else {
    console.error("❌ Mensagem inválida!");
    console.error("Padrão exigido: tipo(escopo): descrição min_5_caracteres");
    console.error("Tipos válidos: feat, fix, docs, style, refactor, test, chore");
    console.error("Exemplo correto: feat(auth): add validation to user signin");
    process.exit(1);
}
