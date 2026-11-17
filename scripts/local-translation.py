"""Loopback-only translation service using the official Argos model packages."""

import argparse
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json
from pathlib import Path
import re
import shutil
from zipfile import ZipFile

import ctranslate2
import langid
import sentencepiece


LANGUAGES = ("en", "zh", "ms")
PAIRS = (("en", "zh"), ("zh", "en"), ("en", "ms"), ("ms", "en"))


def load_model(model_root, source, target):
    stem = f"{source}_{target}"
    folder = model_root / stem
    with ZipFile(model_root / f"{stem}.argosmodel") as archive:
        metadata_name = next(
            item for item in archive.namelist() if item.count("/") == 1 and item.endswith("/metadata.json")
        )
        package = metadata_name.split("/")[0] + "/"
        metadata = json.loads(archive.read(metadata_name))
        if (metadata["from_code"], metadata["to_code"]) != (source, target):
            raise ValueError(f"Unexpected languages in {stem}")
        allowed = (
            "sentencepiece.model",
            "model/config.json",
            "model/model.bin",
            "model/shared_vocabulary.json",
            "model/source_vocabulary.json",
            "model/target_vocabulary.json",
        )
        for name in allowed:
            if package + name not in archive.namelist():
                continue
            path = folder / name
            path.parent.mkdir(parents=True, exist_ok=True)
            if path.exists() and path.stat().st_size == archive.getinfo(package + name).file_size:
                continue
            with archive.open(package + name) as src, path.open("wb") as dst:
                shutil.copyfileobj(src, dst)

    tokenizer = sentencepiece.SentencePieceProcessor(model_file=str(folder / "sentencepiece.model"))
    translator = ctranslate2.Translator(str(folder / "model"), device="cpu", intra_threads=2)
    return tokenizer, translator, metadata.get("target_prefix", "")


class TranslationService:
    def __init__(self, model_root):
        self.models = {pair: load_model(model_root, *pair) for pair in PAIRS}
        langid.set_languages(list(LANGUAGES))

    def direct(self, text, source, target):
        tokenizer, translator, prefix = self.models[(source, target)]
        if source == "en":
            text = re.sub(r"\blectern(s?)\b", r"podium\1", text, flags=re.IGNORECASE)
        paragraphs = text.split("\n")
        tokens = [tokenizer.encode(line, out_type=str) for line in paragraphs]
        options = {"beam_size": 3, "replace_unknowns": True, "max_input_length": 1200, "max_decoding_length": 600}
        if prefix:
            options["target_prefix"] = [[prefix] for _ in tokens]
        results = translator.translate_batch(tokens, **options)
        return "\n".join(
            tokenizer.decode(result.hypotheses[0]).replace("▁", " ").removeprefix(prefix).strip()
            for result in results
        )

    def translate(self, text, source, target):
        if source == "auto":
            source = langid.classify(text)[0]
        if source == target:
            return text, source
        if (source, target) not in self.models:
            return self.direct(self.direct(text, source, "en"), "en", target), source
        return self.direct(text, source, target), source


def handler_for(service):
    class Handler(BaseHTTPRequestHandler):
        def send_json(self, status, payload):
            body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
            self.send_response(status)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            try:
                self.wfile.write(body)
            except (BrokenPipeError, ConnectionResetError):
                pass

        def do_GET(self):
            if self.path == "/health":
                self.send_json(200, {"ready": True, "languages": LANGUAGES})
            else:
                self.send_json(404, {"error": "Not found"})

        def do_POST(self):
            if self.path != "/translate" or self.headers.get("Origin"):
                self.send_json(404, {"error": "Not found"})
                return
            try:
                size = int(self.headers.get("Content-Length", "0"))
                if not 0 < size <= 16384:
                    raise ValueError("invalid size")
                payload = json.loads(self.rfile.read(size))
                text = payload["q"]
                source, target = payload["source"], payload["target"]
                if not isinstance(text, str) or not 0 < len(text.strip()) <= 1500:
                    raise ValueError("invalid text")
                if source not in (*LANGUAGES, "auto") or target not in LANGUAGES:
                    raise ValueError("invalid language")
            except (ValueError, KeyError, TypeError):
                self.send_json(400, {"error": "Invalid translation request"})
                return
            try:
                translated, detected = service.translate(text, source, target)
            except Exception:
                self.send_json(500, {"error": "Translation failed"})
                return
            self.send_json(200, {"translatedText": translated, "detectedLanguage": {"language": detected}})

    return Handler


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--models", type=Path, default=Path(".data/translation"))
    parser.add_argument("--port", type=int, default=3117)
    args = parser.parse_args()
    service = TranslationService(args.models)
    server = ThreadingHTTPServer(("127.0.0.1", args.port), handler_for(service))
    print(f"Argos translation ready at http://127.0.0.1:{args.port}", flush=True)
    server.serve_forever()


if __name__ == "__main__":
    main()
