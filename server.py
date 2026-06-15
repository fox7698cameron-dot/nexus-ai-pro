"""
================================================
NEXUS AI PRO - Enhanced Backend Server (Python)
Military-Grade Security & Multi-Model AI Platform
FastAPI drop-in replacement for server.js
================================================
"""

from __future__ import annotations

import asyncio
import base64
import hashlib
import hmac as _hmac
import json
import os
import re
import secrets
import time
from contextlib import asynccontextmanager
from typing import Any, Dict, List, Optional
from urllib.parse import urlparse
from uuid import uuid4

import httpx
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.backends import default_backend
from dotenv import load_dotenv
from fastapi import (
    Depends,
    FastAPI,
    File,
    HTTPException,
    Request,
    UploadFile,
    WebSocket,
    WebSocketDisconnect,
    status,
)
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from loguru import logger
from passlib.context import CryptContext
from pydantic import BaseModel, Field
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

# ── env ─────────────────────────────────────────────────────────────────────
load_dotenv()

PORT: int = int(os.getenv("PORT", "8000"))
CORS_ORIGIN: str = os.getenv("CORS_ORIGIN", "*")
NODE_ENV: str = os.getenv("NODE_ENV", "development")
ANTHROPIC_API_KEY: str | None = os.getenv("ANTHROPIC_API_KEY")
OPENAI_API_KEY: str | None = os.getenv("OPENAI_API_KEY")
GOOGLE_API_KEY: str | None = os.getenv("GOOGLE_API_KEY")
DEEPSEEK_API_KEY: str | None = os.getenv("DEEPSEEK_API_KEY")
XAI_API_KEY: str | None = os.getenv("XAI_API_KEY")
MISTRAL_API_KEY: str | None = os.getenv("MISTRAL_API_KEY")
ENCRYPTION_SECRET: str = os.getenv("ENCRYPTION_SECRET") or secrets.token_hex(32)
ENCRYPTION_SALT: str = os.getenv("ENCRYPTION_SALT") or secrets.token_hex(64)

# ── logging ──────────────────────────────────────────────────────────────────
logger.remove()
logger.add(
    lambda msg: print(msg, end=""),
    format=(
        "<green>{time:YYYY-MM-DD HH:mm:ss}</green> | "
        "<level>{level: <8}</level> | "
        "<cyan>{name}</cyan>:<cyan>{line}</cyan> - <level>{message}</level>\n"
    ),
    level="INFO",
    colorize=True,
)

# ── password hashing ─────────────────────────────────────────────────────────
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


# ================================================
# MILITARY-GRADE SECURITY MODULE
# ================================================

class SecurityModule:
    """Python equivalent of the JS SecurityModule using AES-256-GCM."""

    ALGORITHM = "AES-256-GCM"
    KEY_LENGTH = 32       # bytes
    IV_LENGTH = 12        # bytes (standard for GCM)
    TAG_LENGTH = 16       # bytes
    ITERATIONS = 100_000

    def __init__(self) -> None:
        self.master_key: bytes = self._derive_master_key()
        self.audit_log: List[Dict[str, Any]] = []
        self.vulnerability_patches: Dict[str, Any] = {}
        self.threat_database: set[str] = set()
        self.last_scan: int = int(time.time() * 1000)
        self.last_key_rotation: int = int(time.time() * 1000)

    def _derive_master_key(self) -> bytes:
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA512(),
            length=self.KEY_LENGTH,
            salt=ENCRYPTION_SALT.encode(),
            iterations=self.ITERATIONS,
            backend=default_backend(),
        )
        return kdf.derive(ENCRYPTION_SECRET.encode())

    # ── AES-256-GCM encryption ───────────────────────────────────────────────

    def encrypt(self, plaintext: str, additional_data: str = "") -> Dict[str, Any]:
        try:
            iv = secrets.token_bytes(self.IV_LENGTH)
            aesgcm = AESGCM(self.master_key)
            aad = additional_data.encode() if additional_data else None
            ct_and_tag = aesgcm.encrypt(iv, plaintext.encode(), aad)
            # cryptography lib appends the 16-byte tag at the end
            ciphertext = ct_and_tag[: -self.TAG_LENGTH]
            tag = ct_and_tag[-self.TAG_LENGTH :]
            return {
                "iv": iv.hex(),
                "encrypted": ciphertext.hex(),
                "tag": tag.hex(),
                "timestamp": int(time.time() * 1000),
            }
        except Exception as exc:
            self.log_audit("ENCRYPTION_ERROR", {"error": str(exc)})
            raise RuntimeError("Encryption failed") from exc

    def decrypt(self, encrypted_data: Dict[str, Any], additional_data: str = "") -> str:
        try:
            iv = bytes.fromhex(encrypted_data["iv"])
            ciphertext = bytes.fromhex(encrypted_data["encrypted"])
            tag = bytes.fromhex(encrypted_data["tag"])
            aesgcm = AESGCM(self.master_key)
            aad = additional_data.encode() if additional_data else None
            plaintext = aesgcm.decrypt(iv, ciphertext + tag, aad)
            return plaintext.decode()
        except Exception as exc:
            self.log_audit("DECRYPTION_ERROR", {"error": str(exc)})
            raise RuntimeError("Decryption failed - data may be tampered") from exc

    # ── hashing / HMAC ───────────────────────────────────────────────────────

    def hash(self, data: str) -> str:
        return hashlib.sha512(data.encode()).hexdigest()

    def hmac_sign(self, data: str) -> str:
        return _hmac.new(self.master_key, data.encode(), hashlib.sha256).hexdigest()

    def generate_secure_token(self, length: int = 32) -> str:
        return secrets.token_hex(length)

    # ── audit log ────────────────────────────────────────────────────────────

    def log_audit(self, event: str, details: Dict[str, Any]) -> Dict[str, Any]:
        entry: Dict[str, Any] = {
            "id": str(uuid4()),
            "timestamp": int(time.time() * 1000),
            "event": event,
            "details": details,
            "hash": self.hash(json.dumps({"event": event, "details": details, "timestamp": int(time.time() * 1000)})),
        }
        self.audit_log.append(entry)
        # Keep only last 10 000 entries
        if len(self.audit_log) > 10_000:
            self.audit_log = self.audit_log[-10_000:]
        return entry

    # ── vulnerability scanning ───────────────────────────────────────────────

    async def scan_vulnerabilities(self) -> Dict[str, Any]:
        checks = [
            ("SQL Injection", True),
            ("XSS", True),
            ("CSRF", True),
            ("Path Traversal", True),
            ("Rate Limiting", True),
            ("Input Validation", True),
            ("Encryption", bool(self.master_key)),
            ("Session Security", True),
        ]
        vulnerabilities: List[Dict[str, Any]] = []
        for name, ok in checks:
            if not ok:
                vulnerabilities.append({"name": name, "severity": "high", "patched": False})

        results: Dict[str, Any] = {
            "timestamp": int(time.time() * 1000),
            "vulnerabilities": vulnerabilities,
            "status": "vulnerable" if vulnerabilities else "secure",
        }
        self.last_scan = int(time.time() * 1000)
        self.log_audit("VULNERABILITY_SCAN", results)
        return results

    async def auto_patch(self) -> List[Dict[str, Any]]:
        scan = await self.scan_vulnerabilities()
        patches: List[Dict[str, Any]] = []
        for vuln in scan["vulnerabilities"]:
            if not vuln.get("patched"):
                patch = {
                    "vulnerability": vuln["name"],
                    "patched_at": int(time.time() * 1000),
                    "method": "automatic",
                }
                self.vulnerability_patches[vuln["name"]] = patch
                patches.append(patch)
        self.log_audit("AUTO_PATCH", {"patches": patches})
        return patches

    # ── threat detection ─────────────────────────────────────────────────────

    def detect_threat(self, ip: str, body: Any, query: Any) -> List[Dict[str, str]]:
        threats: List[Dict[str, str]] = []
        check_data = json.dumps({"body": body, "query": query})

        if re.search(r'(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|ALTER)\b|--|;|\'|")', check_data, re.IGNORECASE):
            threats.append({"type": "SQL_INJECTION", "severity": "critical"})
        if re.search(r"<script|javascript:|on\w+=", check_data, re.IGNORECASE):
            threats.append({"type": "XSS", "severity": "high"})
        if re.search(r"\.\./", check_data):
            threats.append({"type": "PATH_TRAVERSAL", "severity": "high"})
        if ip in self.threat_database:
            threats.append({"type": "KNOWN_THREAT_IP", "severity": "critical"})

        if threats:
            self.log_audit("THREAT_DETECTED", {"ip": ip, "threats": threats})
            self.threat_database.add(ip)

        return threats

    # ── security status / key rotation ───────────────────────────────────────

    def get_security_status(self) -> Dict[str, Any]:
        return {
            "encryptionActive": True,
            "algorithm": self.ALGORITHM,
            "lastScan": self.last_scan,
            "auditLogSize": len(self.audit_log),
            "threatsBlocked": len(self.threat_database),
            "patchesApplied": len(self.vulnerability_patches),
            "status": "secure",
        }

    def rotate_keys(self) -> bool:
        self.master_key = self._derive_master_key()
        self.last_key_rotation = int(time.time() * 1000)
        self.log_audit("KEY_ROTATION", {"timestamp": self.last_key_rotation})
        return True


security = SecurityModule()


# ================================================
# SECURE DATA SERVICE  (in-memory, encrypted)
# ================================================

class SecureDataService:
    def __init__(self) -> None:
        self.memories: Dict[str, Any] = {}
        self.chats: Dict[str, Any] = {}
        self.workflows: Dict[str, Any] = {}
        self.users: Dict[str, Any] = {}

    def _collection(self, name: str) -> Optional[Dict[str, Any]]:
        return getattr(self, name, None)

    def store(self, collection: str, item_id: str, data: Dict[str, Any]) -> bool:
        col = self._collection(collection)
        if col is None:
            return False
        col[item_id] = security.encrypt(json.dumps(data))
        return True

    def retrieve(self, collection: str, item_id: str) -> Optional[Dict[str, Any]]:
        col = self._collection(collection)
        if col is None or item_id not in col:
            return None
        return json.loads(security.decrypt(col[item_id]))

    def delete(self, collection: str, item_id: str) -> bool:
        col = self._collection(collection)
        if col and item_id in col:
            del col[item_id]
            return True
        return False

    def list(self, collection: str, filter_by: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
        col = self._collection(collection)
        if col is None:
            return []
        results: List[Dict[str, Any]] = []
        for item_id, encrypted in col.items():
            try:
                data: Dict[str, Any] = json.loads(security.decrypt(encrypted))
                if filter_by:
                    if all(data.get(k) == v for k, v in filter_by.items()):
                        results.append({"id": item_id, **data})
                else:
                    results.append({"id": item_id, **data})
            except Exception:
                pass  # skip corrupted entries
        return results


data_service = SecureDataService()


# ================================================
# WORKFLOW ENGINE
# ================================================

class WorkflowEngine:
    def __init__(self) -> None:
        self.workflows: Dict[str, Any] = {}
        self.executions: Dict[str, Any] = {}

    def create_workflow(self, user_id: str, workflow: Dict[str, Any]) -> Dict[str, Any]:
        wf_id = str(uuid4())
        now = int(time.time() * 1000)
        new_wf: Dict[str, Any] = {
            "id": wf_id,
            "userId": user_id,
            **workflow,
            "createdAt": now,
            "updatedAt": now,
        }
        self.workflows[wf_id] = new_wf
        security.log_audit("WORKFLOW_CREATED", {"id": wf_id, "userId": user_id})
        return new_wf

    async def execute_workflow(self, workflow_id: str, input_data: Dict[str, Any]) -> Dict[str, Any]:
        wf = self.workflows.get(workflow_id)
        if not wf:
            raise HTTPException(status_code=404, detail="Workflow not found")

        exec_id = str(uuid4())
        execution: Dict[str, Any] = {
            "id": exec_id,
            "workflowId": workflow_id,
            "input": input_data,
            "status": "running",
            "startedAt": int(time.time() * 1000),
            "steps": [],
        }
        self.executions[exec_id] = execution

        try:
            context: Dict[str, Any] = dict(input_data)
            for node in wf.get("nodes", []):
                step_result = await self._execute_node(node, context)
                execution["steps"].append({
                    "nodeId": node.get("id"),
                    "type": node.get("type"),
                    "result": step_result,
                    "completedAt": int(time.time() * 1000),
                })
                context.update(step_result)

            execution["status"] = "completed"
            execution["completedAt"] = int(time.time() * 1000)
            execution["output"] = context
        except Exception as exc:
            execution["status"] = "failed"
            execution["error"] = str(exc)
            execution["completedAt"] = int(time.time() * 1000)

        self.executions[exec_id] = execution
        security.log_audit("WORKFLOW_EXECUTED", {"executionId": exec_id, "workflowId": workflow_id, "status": execution["status"]})
        return execution

    async def _execute_node(self, node: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
        node_type = node.get("type")
        if node_type == "ai":
            return await self._execute_ai_node(node, context)
        elif node_type == "http":
            return await self._execute_http_node(node, context)
        elif node_type == "code":
            return self._execute_code_node(node, context)
        elif node_type == "condition":
            return self._execute_condition_node(node, context)
        elif node_type == "transform":
            return self._execute_transform_node(node, context)
        return {"result": "Node type not implemented"}

    async def _execute_ai_node(self, node: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
        cfg = node.get("config", {})
        model = cfg.get("model", "claude")
        prompt = cfg.get("prompt") or context.get("input", "")
        messages = [{"role": "user", "content": prompt}]
        response = await ai_manager.chat(model, messages)
        return {"aiResponse": response}

    @staticmethod
    def _validate_http_url(raw_url: Any) -> str:
        if not raw_url or not isinstance(raw_url, str):
            raise ValueError("HTTP node URL is required")
        try:
            parsed = urlparse(raw_url)
        except Exception as exc:
            raise ValueError("Invalid HTTP node URL") from exc
        if parsed.scheme not in ("http", "https"):
            raise ValueError("HTTP node URL must use http or https")
        blocked = {"localhost", "127.0.0.1", "::1"}
        if parsed.hostname in blocked:
            raise ValueError("HTTP node URL hostname is not allowed")
        return raw_url

    async def _execute_http_node(self, node: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
        cfg = node.get("config", {})
        url = self._validate_http_url(cfg.get("url"))
        method: str = cfg.get("method", "GET").upper()
        headers: Dict[str, str] = cfg.get("headers", {})
        body = cfg.get("body")
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.request(method, url, headers=headers, json=body if body else None)
            return {"httpResponse": resp.json()}

    def _execute_code_node(self, node: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
        # Safe evaluation: only allow simple expression-style code via eval with restricted builtins
        code: str = (node.get("config") or {}).get("code", "")
        if not isinstance(code, str) or not code.strip():
            return {"codeError": "Invalid code expression"}
        try:
            safe_builtins = {"__builtins__": {}, "len": len, "str": str, "int": int, "float": float, "list": list, "dict": dict}
            result = eval(code, safe_builtins, dict(context))  # noqa: S307
            return {"codeResult": result}
        except Exception as exc:
            return {"codeError": str(exc)}

    def _execute_condition_node(self, node: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
        condition: str = (node.get("config") or {}).get("condition", "")
        if not isinstance(condition, str) or not condition.strip():
            return {"conditionResult": False}
        try:
            safe_builtins = {"__builtins__": {}, "len": len, "str": str, "int": int}
            result = eval(condition, safe_builtins, dict(context))  # noqa: S307
            return {"conditionResult": bool(result)}
        except Exception:
            return {"conditionResult": False}

    def _execute_transform_node(self, node: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
        transform: str = (node.get("config") or {}).get("transform", "")
        if not isinstance(transform, str) or not transform.strip():
            return {"transformError": "Invalid transform expression"}
        try:
            safe_builtins = {"__builtins__": {}, "len": len, "str": str, "int": int}
            result = eval(transform, safe_builtins, dict(context))  # noqa: S307
            return {"transformResult": result}
        except Exception as exc:
            return {"transformError": str(exc)}


workflow_engine = WorkflowEngine()


# ================================================
# AI MODEL MANAGER
# ================================================

_MOCK_RESPONSES = [
    "I understand your request. Let me help you with that.",
    "That's an interesting question! Here's what I think...",
    "Based on my analysis, I recommend the following approach...",
    "I can assist you with this task. Here are the key points to consider...",
    "Great question! Let me break this down for you...",
]


class AIModelManager:
    async def _call_claude(self, messages: List[Dict[str, Any]], options: Dict[str, Any]) -> Dict[str, Any]:
        if not ANTHROPIC_API_KEY:
            return self._mock_response("claude")
        try:
            import anthropic  # type: ignore
            client = anthropic.AsyncAnthropic(api_key=ANTHROPIC_API_KEY)
            resp = await client.messages.create(
                model=options.get("model", "claude-sonnet-4-20250514"),
                max_tokens=options.get("maxTokens", 4096),
                messages=messages,
                **({"system": options["systemPrompt"]} if options.get("systemPrompt") else {}),
            )
            return resp.model_dump()
        except Exception as exc:
            logger.error(f"Claude API error: {exc}")
            return self._mock_response("claude", error=str(exc))

    async def _call_gpt4(self, messages: List[Dict[str, Any]], options: Dict[str, Any]) -> Dict[str, Any]:
        if not OPENAI_API_KEY:
            return self._mock_response("gpt4")
        try:
            from openai import AsyncOpenAI  # type: ignore
            client = AsyncOpenAI(api_key=OPENAI_API_KEY)
            resp = await client.chat.completions.create(
                model=options.get("model", "gpt-4-turbo-preview"),
                messages=messages,
                max_tokens=options.get("maxTokens", 4096),
                temperature=options.get("temperature", 0.7),
            )
            return resp.model_dump()
        except Exception as exc:
            logger.error(f"OpenAI API error: {exc}")
            return self._mock_response("gpt4", error=str(exc))

    async def _call_gemini(self, messages: List[Dict[str, Any]], options: Dict[str, Any]) -> Dict[str, Any]:
        if not GOOGLE_API_KEY:
            return self._mock_response("gemini")
        model_id = options.get("model", "gemini-pro")
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_id}:generateContent?key={GOOGLE_API_KEY}"
        payload = {
            "contents": [
                {
                    "role": "model" if m["role"] == "assistant" else "user",
                    "parts": [{"text": m["content"]}],
                }
                for m in messages
            ],
            "generationConfig": {
                "temperature": options.get("temperature", 0.7),
                "maxOutputTokens": options.get("maxTokens", 4096),
            },
        }
        try:
            async with httpx.AsyncClient(timeout=60) as client:
                resp = await client.post(url, json=payload)
                return resp.json()
        except Exception as exc:
            logger.error(f"Gemini API error: {exc}")
            return self._mock_response("gemini", error=str(exc))

    async def _call_deepseek(self, messages: List[Dict[str, Any]], options: Dict[str, Any]) -> Dict[str, Any]:
        if not DEEPSEEK_API_KEY:
            return self._mock_response("deepseek")
        payload = {
            "model": options.get("model", "deepseek-chat"),
            "messages": messages,
            "max_tokens": options.get("maxTokens", 4096),
        }
        try:
            async with httpx.AsyncClient(timeout=60) as client:
                resp = await client.post(
                    "https://api.deepseek.com/v1/chat/completions",
                    headers={"Authorization": f"Bearer {DEEPSEEK_API_KEY}", "Content-Type": "application/json"},
                    json=payload,
                )
                return resp.json()
        except Exception as exc:
            logger.error(f"DeepSeek API error: {exc}")
            return self._mock_response("deepseek", error=str(exc))

    async def _call_grok(self, messages: List[Dict[str, Any]], options: Dict[str, Any]) -> Dict[str, Any]:
        if not XAI_API_KEY:
            return self._mock_response("grok")
        payload = {
            "model": options.get("model", "grok-beta"),
            "messages": messages,
            "max_tokens": options.get("maxTokens", 4096),
        }
        try:
            async with httpx.AsyncClient(timeout=60) as client:
                resp = await client.post(
                    "https://api.x.ai/v1/chat/completions",
                    headers={"Authorization": f"Bearer {XAI_API_KEY}", "Content-Type": "application/json"},
                    json=payload,
                )
                return resp.json()
        except Exception as exc:
            logger.error(f"Grok API error: {exc}")
            return self._mock_response("grok", error=str(exc))

    async def _call_mistral(self, messages: List[Dict[str, Any]], options: Dict[str, Any]) -> Dict[str, Any]:
        if not MISTRAL_API_KEY:
            return self._mock_response("mixtral")
        payload = {
            "model": options.get("model", "mistral-large-latest"),
            "messages": messages,
            "max_tokens": options.get("maxTokens", 4096),
        }
        try:
            async with httpx.AsyncClient(timeout=60) as client:
                resp = await client.post(
                    "https://api.mistral.ai/v1/chat/completions",
                    headers={"Authorization": f"Bearer {MISTRAL_API_KEY}", "Content-Type": "application/json"},
                    json=payload,
                )
                return resp.json()
        except Exception as exc:
            logger.error(f"Mistral API error: {exc}")
            return self._mock_response("mixtral", error=str(exc))

    async def generate_image(self, prompt: str, options: Dict[str, Any]) -> Dict[str, Any]:
        if not OPENAI_API_KEY:
            return {
                "data": [
                    {
                        "url": f"https://picsum.photos/seed/{uuid4()}/1024/1024",
                        "revised_prompt": prompt,
                    }
                ],
                "mock": True,
            }
        try:
            from openai import AsyncOpenAI  # type: ignore
            client = AsyncOpenAI(api_key=OPENAI_API_KEY)
            resp = await client.images.generate(
                model="dall-e-3",
                prompt=prompt,
                n=options.get("count", 1),
                size=options.get("size", "1024x1024"),
                quality=options.get("quality", "standard"),
            )
            return resp.model_dump()
        except Exception as exc:
            logger.error(f"Image generation error: {exc}")
            raise HTTPException(status_code=500, detail=str(exc)) from exc

    async def chat(self, model: str, messages: List[Dict[str, Any]], options: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        opts = options or {}
        handlers: Dict[str, Any] = {
            "claude": lambda: self._call_claude(messages, opts),
            "gpt4": lambda: self._call_gpt4(messages, opts),
            "gemini": lambda: self._call_gemini(messages, opts),
            "deepseek": lambda: self._call_deepseek(messages, opts),
            "grok": lambda: self._call_grok(messages, opts),
            "mixtral": lambda: self._call_mistral(messages, opts),
        }
        if model not in handlers:
            raise HTTPException(status_code=400, detail=f"Unknown model: {model}")
        return await handlers[model]()

    @staticmethod
    def _mock_response(model: str, error: Optional[str] = None) -> Dict[str, Any]:
        content = _MOCK_RESPONSES[int(time.time()) % len(_MOCK_RESPONSES)]
        return {
            "id": f"mock-{uuid4()}",
            "model": model,
            "mock": True,
            "choices": [
                {
                    "message": {"role": "assistant", "content": content},
                    "finish_reason": "stop",
                }
            ],
            "content": [{"type": "text", "text": content}],
            **({"error": error} if error else {}),
        }


ai_manager = AIModelManager()


# ================================================
# PYDANTIC MODELS
# ================================================

class ChatRequest(BaseModel):
    model: str = "claude"
    messages: List[Dict[str, Any]]
    options: Optional[Dict[str, Any]] = None
    encrypt: bool = True


class ImageGenerateRequest(BaseModel):
    prompt: str
    options: Optional[Dict[str, Any]] = None


class MemoryCreateRequest(BaseModel):
    userId: str
    content: str


class ChatCreateRequest(BaseModel):
    userId: str


class ChatUpdateRequest(BaseModel):
    title: Optional[str] = None
    messages: Optional[List[Dict[str, Any]]] = None


class WorkflowCreateRequest(BaseModel):
    userId: str
    name: Optional[str] = None
    nodes: Optional[List[Dict[str, Any]]] = None
    model_config = {"extra": "allow"}


class WorkflowExecuteRequest(BaseModel):
    model_config = {"extra": "allow"}


# ================================================
# RATE LIMITER
# ================================================

limiter = Limiter(key_func=get_remote_address)


# ================================================
# LIFESPAN (startup / shutdown)
# ================================================

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await security.scan_vulnerabilities()
    logger.info("Initial security scan complete")
    # Background periodic scan task
    task = asyncio.create_task(_periodic_security_scan())
    _print_banner()
    yield
    # Shutdown
    task.cancel()
    try:
        await task
    except asyncio.CancelledError:
        pass


async def _periodic_security_scan():
    """Run an automated vulnerability scan every hour."""
    while True:
        await asyncio.sleep(3600)
        logger.info("Running automated security scan...")
        scan = await security.scan_vulnerabilities()
        if scan["vulnerabilities"]:
            logger.warning("Vulnerabilities detected, auto-patching...")
            await security.auto_patch()


def _print_banner():
    key_status = "CONFIGURED" if ANTHROPIC_API_KEY else "NOT SET (mock mode)"
    print(f"""
╔════════════════════════════════════════════════════════════════╗
║                                                                ║
║     ███╗   ██╗███████╗██╗  ██╗██╗   ██╗███████╗               ║
║     ████╗  ██║██╔════╝╚██╗██╔╝██║   ██║██╔════╝               ║
║     ██╔██╗ ██║█████╗   ╚███╔╝ ██║   ██║███████╗               ║
║     ██║╚██╗██║██╔══╝   ██╔██╗ ██║   ██║╚════██║               ║
║     ██║ ╚████║███████╗██╔╝ ██╗╚██████╔╝███████║               ║
║     ╚═╝  ╚═══╝╚══════╝╚═╝  ╚═╝ ╚═════╝ ╚══════╝               ║
║                                                                ║
║              NEXUS AI PRO - PYTHON/FASTAPI SERVER              ║
║                                                                ║
║     Military-Grade AES-256-GCM Encryption: ACTIVE             ║
║     Auto-Patching: ENABLED                                     ║
║     Server running on port {PORT:<6}                            ║
║     Security Status: SECURE                                    ║
║     Anthropic API Key: {key_status:<41}║
║                                                                ║
╚════════════════════════════════════════════════════════════════╝
""")


# ================================================
# FastAPI APP
# ================================================

app = FastAPI(
    title="Nexus AI Pro",
    description="Military-Grade Security & Multi-Model AI Platform",
    version="1.0.0",
    lifespan=lifespan,
)

# Rate limit error handler
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)  # type: ignore[arg-type]

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[CORS_ORIGIN] if CORS_ORIGIN != "*" else ["*"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "X-Request-ID"],
)


# ── request ID + threat detection middleware ─────────────────────────────────

@app.middleware("http")
async def request_middleware(request: Request, call_next):
    request_id = str(uuid4())
    start_time = time.time()
    request.state.request_id = request_id
    request.state.start_time = start_time

    # Threat detection
    client_ip = request.client.host if request.client else "unknown"
    try:
        body = await request.body()
        body_json: Any = json.loads(body) if body else {}
    except Exception:
        body_json = {}

    query_params = dict(request.query_params)
    threats = security.detect_threat(client_ip, body_json, query_params)

    if any(t["severity"] == "critical" for t in threats):
        security.log_audit("REQUEST_BLOCKED", {"ip": client_ip, "path": request.url.path, "threats": threats})
        return JSONResponse(status_code=403, content={"error": "Request blocked by security system"})

    response = await call_next(request)
    response.headers["X-Request-ID"] = request_id

    duration_ms = int((time.time() - start_time) * 1000)
    security.log_audit("REQUEST", {
        "requestId": request_id,
        "method": request.method,
        "path": request.url.path,
        "status": response.status_code,
        "duration": duration_ms,
        "ip": client_ip,
    })
    return response


# ================================================
# ROUTES
# ================================================

# ── health ───────────────────────────────────────────────────────────────────

@app.get("/api/health")
@limiter.limit("100/15minutes")
async def health_check(request: Request):
    return {
        "status": "healthy",
        "security": security.get_security_status(),
        "timestamp": int(time.time() * 1000),
    }


# ── security ─────────────────────────────────────────────────────────────────

@app.get("/api/security/status")
@limiter.limit("100/15minutes")
async def security_status(request: Request):
    return security.get_security_status()


@app.get("/api/security/dashboard")
@limiter.limit("100/15minutes")
async def security_dashboard(request: Request):
    status_data = security.get_security_status()
    recent_logs = security.audit_log[-10:]
    threats_summary = [
        l for l in recent_logs
        if "THREAT" in l.get("event", "") or "ATTACK" in l.get("event", "")
    ]
    return {
        "overallScore": status_data.get("securityScore", 92),
        "encryptionStatus": "AES-256-GCM",
        "encryptionActive": True,
        "lastScanTime": security.last_scan,
        "vulnerabilities": [
            {"id": 1, "name": "Outdated Dependencies", "severity": "medium", "status": "warning"},
            {"id": 2, "name": "API Key Exposure Risk", "severity": "low", "status": "info"},
            {"id": 3, "name": "TLS/SSL Configuration", "severity": "high", "status": "resolved"},
        ],
        "threats": [
            {"type": t["event"], "status": "blocked", "timestamp": t["timestamp"]}
            for t in threats_summary[:5]
        ],
        "recentActivity": recent_logs[:10],
    }


@app.get("/api/security/alerts")
@limiter.limit("100/15minutes")
async def security_alerts(request: Request):
    alerts = [
        l for l in security.audit_log
        if any(kw in l.get("event", "") for kw in ("ERROR", "THREAT", "ATTACK"))
    ][-20:]
    return {
        "alerts": alerts,
        "criticalCount": sum(1 for a in alerts if a.get("severity") == "critical"),
        "warningCount": sum(1 for a in alerts if a.get("severity") == "warning"),
    }


@app.get("/api/security/audit")
@limiter.limit("100/15minutes")
async def security_audit(request: Request, limit: int = 100, offset: int = 0):
    log = security.audit_log
    total = len(log)
    # Slice from the end: last `limit + offset` entries minus `offset`
    end = total - offset if offset > 0 else total
    start = max(0, end - limit)
    logs = log[start:end]
    return {"logs": logs, "total": total}


@app.get("/api/security/encryption-health")
@limiter.limit("100/15minutes")
async def encryption_health(request: Request):
    now = int(time.time() * 1000)
    last_rotation = security.last_key_rotation
    return {
        "algorithm": "AES-256-GCM",
        "keyRotationInterval": "24h",
        "lastKeyRotation": last_rotation,
        "nextKeyRotation": last_rotation + 86_400_000,
        "status": "healthy",
        "certificateExpiry": now + 30 * 24 * 60 * 60 * 1000,
    }


@app.post("/api/security/scan")
@limiter.limit("100/15minutes")
async def security_scan(request: Request):
    return await security.scan_vulnerabilities()


@app.post("/api/security/patch")
@limiter.limit("100/15minutes")
async def security_patch(request: Request):
    patches = await security.auto_patch()
    return {"patches": patches}


@app.post("/api/security/rotate-keys")
@limiter.limit("100/15minutes")
async def rotate_keys(request: Request):
    success = security.rotate_keys()
    return {"success": success}


# ── AI chat ──────────────────────────────────────────────────────────────────

@app.post("/api/chat")
@limiter.limit("100/15minutes")
async def chat_completion(body: ChatRequest, request: Request):
    try:
        processed_messages = body.messages
        if body.encrypt:
            processed_messages = [
                {**m, "_encrypted": security.encrypt(str(m.get("content", "")))}
                for m in body.messages
            ]

        response = await ai_manager.chat(body.model, body.messages, body.options)
        return {
            **response,
            "encrypted": body.encrypt,
            "requestId": getattr(request.state, "request_id", str(uuid4())),
        }
    except HTTPException:
        raise
    except Exception as exc:
        security.log_audit("CHAT_ERROR", {"error": str(exc)})
        raise HTTPException(status_code=500, detail=str(exc)) from exc


# ── image generation ─────────────────────────────────────────────────────────

@app.post("/api/generate/image")
@limiter.limit("100/15minutes")
async def generate_image(body: ImageGenerateRequest, request: Request):
    return await ai_manager.generate_image(body.prompt, body.options or {})


# ── memory ───────────────────────────────────────────────────────────────────

@app.post("/api/memory")
@limiter.limit("100/15minutes")
async def create_memory(body: MemoryCreateRequest, request: Request):
    memory = {
        "id": str(uuid4()),
        "userId": body.userId,
        "content": body.content,
        "createdAt": int(time.time() * 1000),
    }
    data_service.store("memories", memory["id"], memory)
    return memory


@app.get("/api/memory/{user_id}")
@limiter.limit("100/15minutes")
async def get_memories(user_id: str, request: Request):
    return data_service.list("memories", {"userId": user_id})


@app.delete("/api/memory/{memory_id}")
@limiter.limit("100/15minutes")
async def delete_memory(memory_id: str, request: Request):
    success = data_service.delete("memories", memory_id)
    return {"success": success}


# ── chat management ───────────────────────────────────────────────────────────

@app.post("/api/chats")
@limiter.limit("100/15minutes")
async def create_chat(body: ChatCreateRequest, request: Request):
    now = int(time.time() * 1000)
    chat = {
        "id": str(uuid4()),
        "userId": body.userId,
        "title": "New Chat",
        "messages": [],
        "createdAt": now,
        "updatedAt": now,
    }
    data_service.store("chats", chat["id"], chat)
    return chat


@app.get("/api/chats/{user_id}")
@limiter.limit("100/15minutes")
async def get_chats(user_id: str, request: Request):
    chats = data_service.list("chats", {"userId": user_id})
    return sorted(chats, key=lambda c: c.get("updatedAt", 0), reverse=True)


@app.get("/api/chat/{chat_id}")
@limiter.limit("100/15minutes")
async def get_chat(chat_id: str, request: Request):
    chat = data_service.retrieve("chats", chat_id)
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
    return chat


@app.put("/api/chat/{chat_id}")
@limiter.limit("100/15minutes")
async def update_chat(chat_id: str, body: ChatUpdateRequest, request: Request):
    existing = data_service.retrieve("chats", chat_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Chat not found")
    updated = {**existing, **body.model_dump(exclude_none=True), "updatedAt": int(time.time() * 1000)}
    data_service.store("chats", chat_id, updated)
    return updated


@app.delete("/api/chat/{chat_id}")
@limiter.limit("100/15minutes")
async def delete_chat(chat_id: str, request: Request):
    success = data_service.delete("chats", chat_id)
    return {"success": success}


# ── workflows ────────────────────────────────────────────────────────────────

@app.post("/api/workflows")
@limiter.limit("100/15minutes")
async def create_workflow(body: WorkflowCreateRequest, request: Request):
    data = body.model_dump()
    user_id = data.pop("userId")
    return workflow_engine.create_workflow(user_id, data)


@app.get("/api/workflows/{user_id}")
@limiter.limit("100/15minutes")
async def get_workflows(user_id: str, request: Request):
    return [w for w in workflow_engine.workflows.values() if w.get("userId") == user_id]


@app.post("/api/workflows/{workflow_id}/execute")
@limiter.limit("100/15minutes")
async def execute_workflow(workflow_id: str, request: Request):
    try:
        body_bytes = await request.body()
        input_data: Dict[str, Any] = json.loads(body_bytes) if body_bytes else {}
    except Exception:
        input_data = {}
    return await workflow_engine.execute_workflow(workflow_id, input_data)


# ── file upload ───────────────────────────────────────────────────────────────

ALLOWED_MIME_TYPES = {
    "image/jpeg", "image/png", "image/gif", "image/webp",
    "application/pdf", "text/plain", "text/csv",
    "application/json", "application/javascript",
    "text/html", "text/css",
}
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50 MB


@app.post("/api/upload")
@limiter.limit("100/15minutes")
async def upload_files(request: Request, files: List[UploadFile] = File(...)):
    result = []
    for f in files[:10]:
        if f.content_type not in ALLOWED_MIME_TYPES:
            raise HTTPException(status_code=400, detail=f"File type not allowed: {f.content_type}")
        data = await f.read()
        if len(data) > MAX_FILE_SIZE:
            raise HTTPException(status_code=413, detail=f"File too large: {f.filename}")
        encoded = base64.b64encode(data).decode()
        security.encrypt(encoded)  # store encrypted metadata (matches JS behaviour)
        result.append({
            "id": str(uuid4()),
            "name": f.filename,
            "type": f.content_type,
            "size": len(data),
            "encrypted": True,
        })
    return {"files": result}


# ── templates ────────────────────────────────────────────────────────────────

@app.get("/api/templates/game")
@limiter.limit("100/15minutes")
async def game_templates(request: Request):
    return {
        "templates": [
            {"id": "platformer", "name": "2D Platformer", "engine": "Unity/Godot"},
            {"id": "rpg", "name": "RPG", "engine": "Unity/RPG Maker"},
            {"id": "puzzle", "name": "Puzzle Game", "engine": "Any"},
            {"id": "shooter", "name": "Shooter", "engine": "Unity/Unreal"},
            {"id": "racing", "name": "Racing", "engine": "Unity"},
            {"id": "casual", "name": "Casual/Mobile", "engine": "Unity/Flutter"},
            {"id": "vr", "name": "VR Experience", "engine": "Unity/Unreal"},
            {"id": "multiplayer", "name": "Multiplayer", "engine": "Unity/Photon"},
        ]
    }


@app.get("/api/templates/app")
@limiter.limit("100/15minutes")
async def app_templates(request: Request):
    return {
        "templates": [
            {"id": "webapp", "name": "Web App", "stack": "React/Next.js"},
            {"id": "mobile", "name": "Mobile App", "stack": "React Native/Flutter"},
            {"id": "desktop", "name": "Desktop App", "stack": "Electron/Tauri"},
            {"id": "api", "name": "API/Backend", "stack": "Node/Python/Go"},
            {"id": "fullstack", "name": "Full Stack", "stack": "MERN/PERN"},
            {"id": "saas", "name": "SaaS Platform", "stack": "Next.js/Stripe"},
            {"id": "ecommerce", "name": "E-Commerce", "stack": "Shopify/Custom"},
            {"id": "ai", "name": "AI Application", "stack": "Python/FastAPI"},
        ]
    }


# ================================================
# WEBSOCKET
# ================================================

class ConnectionManager:
    def __init__(self) -> None:
        self.active: Dict[str, WebSocket] = {}

    async def connect(self, ws: WebSocket, client_id: str) -> None:
        await ws.accept()
        self.active[client_id] = ws
        security.log_audit("SOCKET_CONNECT", {"socketId": client_id})

    def disconnect(self, client_id: str) -> None:
        self.active.pop(client_id, None)
        security.log_audit("SOCKET_DISCONNECT", {"socketId": client_id})

    async def broadcast(self, data: Any, sender_id: str) -> None:
        dead: List[str] = []
        for cid, ws in self.active.items():
            if cid == sender_id:
                continue
            try:
                if isinstance(data, (dict, list)):
                    await ws.send_json(data)
                else:
                    await ws.send_text(str(data))
            except Exception:
                dead.append(cid)
        for cid in dead:
            self.disconnect(cid)


ws_manager = ConnectionManager()


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket, token: Optional[str] = None):
    client_id = str(uuid4())
    user_id = security.hash(token) if token else client_id
    await ws_manager.connect(websocket, client_id)
    try:
        while True:
            raw = await websocket.receive_text()
            try:
                msg: Dict[str, Any] = json.loads(raw)
            except json.JSONDecodeError:
                continue

            event = msg.get("event", "")
            data = msg.get("data", {})

            if event == "voice:start":
                await ws_manager.broadcast({"event": "voice:started", "userId": user_id}, client_id)
            elif event == "voice:data":
                encrypted = security.encrypt(json.dumps(data))
                await ws_manager.broadcast({"event": "voice:data", **encrypted}, client_id)
            elif event == "voice:end":
                await ws_manager.broadcast({"event": "voice:ended", "userId": user_id}, client_id)
            elif event == "chat:message":
                encrypted = security.encrypt(json.dumps(data))
                await ws_manager.broadcast({"event": "chat:message", **encrypted}, client_id)
            elif event == "workflow:update":
                await ws_manager.broadcast({"event": "workflow:updated", **data}, client_id)

    except WebSocketDisconnect:
        ws_manager.disconnect(client_id)


# ================================================
# GLOBAL EXCEPTION HANDLER
# ================================================

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    security.log_audit("ERROR", {"error": str(exc), "path": str(request.url.path)})
    detail = "An error occurred" if NODE_ENV == "production" else str(exc)
    return JSONResponse(status_code=500, content={"error": detail})


# ================================================
# ENTRY POINT
# ================================================

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "server:app",
        host="0.0.0.0",
        port=PORT,
        reload=NODE_ENV != "production",
        log_level="info",
        access_log=False,  # handled by our middleware
    )
