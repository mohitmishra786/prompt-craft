import express from 'express';

const app = express();

// Intentional bug to trigger diagnostics: uncomment to test
const broken = ;

app.get('/health', (req, res) => {
  res.json({ ok: true });
});

// Example runtime error route to produce a stack trace in logs
app.get('/boom', (_req, _res) => {
  // @ts-ignore
  // eslint-disable-next-line no-undef
  throw new Error('Demo crash: ' + foo.notDefined);
});

const port = process.env.PORT || 3001;
app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Demo app listening on http://localhost:${port}`);
});

