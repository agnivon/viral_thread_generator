import { search } from 'duck-duck-scrape';

async function main() {
  const results = await search('test query');
  console.log(JSON.stringify(results.results.slice(0, 5), null, 2));
}

main().catch(console.error);
