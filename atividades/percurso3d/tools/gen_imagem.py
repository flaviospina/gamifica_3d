#!/usr/bin/env python3
"""
Gera uma imagem com a API Gemini (modelos de imagem "Nano Banana").
Lê GEMINI_API_KEY do ambiente (ou de um .env na raiz do projeto); nunca grava a chave.

Uso:
  gen_imagem.py --prompt prompt.txt --out art/_anchor.png [--ref imagem.jpg ...]
                [--model gemini-3-pro-image] [--aspect 16:9] [--size 2K]
"""
import argparse, base64, json, mimetypes, os, sys, time, urllib.request, urllib.error

def carregar_chave():
    chave = os.environ.get('GEMINI_API_KEY') or os.environ.get('GOOGLE_API_KEY')
    if chave:
        return chave
    for cand in ('.env', os.path.join(os.path.dirname(__file__), '..', '..', '..', '.env')):
        if os.path.isfile(cand):
            for linha in open(cand, encoding='utf-8'):
                if linha.startswith('GEMINI_API_KEY='):
                    return linha.split('=', 1)[1].strip().strip('"\'')
    sys.exit('GEMINI_API_KEY não definida (ambiente ou .env).')

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--prompt', required=True, help='arquivo de texto com o prompt')
    ap.add_argument('--out', required=True)
    ap.add_argument('--ref', action='append', default=[], help='imagem de referência (pode repetir)')
    ap.add_argument('--model', default='gemini-3-pro-image')
    ap.add_argument('--aspect', default='16:9')
    ap.add_argument('--size', default='2K', help='1K, 2K ou 4K (quando o modelo aceita)')
    ap.add_argument('--tentativas', type=int, default=3)
    a = ap.parse_args()

    chave = carregar_chave()
    prompt = open(a.prompt, encoding='utf-8').read().strip()
    partes = []
    for ref in a.ref:
        mime = mimetypes.guess_type(ref)[0] or 'image/png'
        partes.append({'inlineData': {'mimeType': mime, 'data': base64.b64encode(open(ref, 'rb').read()).decode()}})
    partes.append({'text': prompt})
    corpo = {
        'contents': [{'role': 'user', 'parts': partes}],
        'generationConfig': {
            'responseModalities': ['IMAGE'],
            'imageConfig': {'aspectRatio': a.aspect, 'imageSize': a.size},
        },
    }
    url = f'https://generativelanguage.googleapis.com/v1beta/models/{a.model}:generateContent'
    req = urllib.request.Request(url, data=json.dumps(corpo).encode(), method='POST',
                                 headers={'Content-Type': 'application/json', 'x-goog-api-key': chave})
    for tent in range(1, a.tentativas + 1):
        try:
            with urllib.request.urlopen(req, timeout=300) as r:
                resp = json.load(r)
            break
        except urllib.error.HTTPError as e:
            msg = e.read().decode(errors='replace')[:600]
            if e.code in (429, 500, 503) and tent < a.tentativas:
                print(f'tentativa {tent}: HTTP {e.code}, aguardando…', file=sys.stderr); time.sleep(8 * tent); continue
            sys.exit(f'HTTP {e.code}: {msg}')
    cands = resp.get('candidates') or []
    for parte in (cands[0].get('content', {}).get('parts', []) if cands else []):
        dados = parte.get('inlineData')
        if dados:
            os.makedirs(os.path.dirname(os.path.abspath(a.out)), exist_ok=True)
            open(a.out, 'wb').write(base64.b64decode(dados['data']))
            uso = resp.get('usageMetadata', {})
            print(json.dumps({'arquivo': a.out, 'mime': dados.get('mimeType'), 'modelo': a.model,
                              'tokensEntrada': uso.get('promptTokenCount'), 'tokensSaida': uso.get('candidatesTokenCount'),
                              'tokensTotal': uso.get('totalTokenCount')}, ensure_ascii=False))
            return
    sys.exit('A resposta não trouxe imagem: ' + json.dumps(resp, ensure_ascii=False)[:800])

if __name__ == '__main__':
    main()
