import EmbeddedPostgres from 'embedded-postgres';

const pg = new EmbeddedPostgres({
    databaseDir: './database/db',
    user: 'postgres',
    password: 'password',
    port: 5432,
    persistent: true,
});

async function main() {
    console.log("DB Initialize");
    await pg.initialise();
    console.log("DB Starting");
    await pg.start();
    console.log("DB running on port 5432");
}

main().catch((err) => {
    console.error('DB error', err);
    process.exit(1);
});