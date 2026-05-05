"""Small YAML reader/writer for Lens configuration files.

This supports the YAML subset used by Lens artifacts: mappings, lists,
inline lists/maps, quoted strings, booleans, nulls, numbers, and block scalars.
It intentionally avoids external dependencies.
"""

from __future__ import annotations

import ast
import json
import re
from typing import Any, Iterable


class YAMLError(ValueError):
    """Raised when input falls outside the supported Lens YAML subset.

    Examples include malformed inline lists such as ``[unclosed``, malformed
    inline mappings such as ``{missing-close``, missing key/value separators,
    and unexpected indentation while reading nested mappings or sequences.
    """


def safe_load(stream: Any) -> Any:
    text = stream.read() if hasattr(stream, "read") else str(stream)
    if not text.strip():
        return None
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass
    parser = _Parser(text)
    return parser.parse()


def safe_dump(
    data: Any,
    stream: Any | None = None,
    default_flow_style: bool | None = None,
    sort_keys: bool = False,
    allow_unicode: bool = True,
    **_: Any,
) -> str | None:
    del default_flow_style
    if data == []:
        text = "[]"
    elif data == {}:
        text = "{}"
    else:
        text = _dump_value(data, 0, sort_keys, allow_unicode)
    if text and not text.endswith("\n"):
        text += "\n"
    if stream is not None:
        stream.write(text)
        return None
    return text


def dump(data: Any, stream: Any | None = None, **kwargs: Any) -> str | None:
    return safe_dump(data, stream=stream, **kwargs)


class _Parser:
    def __init__(self, text: str) -> None:
        self.raw_lines = text.splitlines()
        self.lines = self._prepare(self.raw_lines)
        self.index = 0

    def parse(self) -> Any:
        if not self.lines:
            return None
        value = self._parse_block(self.lines[self.index][0])
        return value

    def _prepare(self, raw_lines: list[str]) -> list[tuple[int, str, str, int]]:
        prepared: list[tuple[int, str, str, int]] = []
        for raw_index, raw in enumerate(raw_lines):
            raw = raw.rstrip("\r\n")
            if not raw.strip() or raw.lstrip().startswith("#"):
                continue
            indent = len(raw) - len(raw.lstrip(" "))
            content = _strip_inline_comment(raw[indent:]).rstrip()
            if content:
                prepared.append((indent, content, raw, raw_index))
        return prepared

    def _parse_block(self, indent: int) -> Any:
        if self.index >= len(self.lines):
            return None
        line_indent, content, _, _ = self.lines[self.index]
        if line_indent < indent:
            return None
        if line_indent != indent:
            raise YAMLError(f"Unexpected indentation at line {self.index + 1}")
        if content.startswith("- ") or content == "-":
            return self._parse_list(indent)
        return self._parse_mapping(indent)

    def _parse_mapping(self, indent: int) -> dict[str, Any]:
        result: dict[str, Any] = {}
        while self.index < len(self.lines):
            line_indent, content, _, raw_index = self.lines[self.index]
            if line_indent < indent:
                break
            if line_indent > indent:
                raise YAMLError(f"Unexpected indentation at line {self.index + 1}")
            if content.startswith("- ") or content == "-":
                break
            key, raw_value = _split_key_value(content)
            self.index += 1
            result[key] = self._parse_value(raw_value, indent, raw_index)
        return result

    def _parse_list(self, indent: int) -> list[Any]:
        result: list[Any] = []
        while self.index < len(self.lines):
            line_indent, content, _, raw_index = self.lines[self.index]
            if line_indent < indent:
                break
            if line_indent != indent or not (content.startswith("- ") or content == "-"):
                break
            item_text = content[1:].strip()
            self.index += 1
            if not item_text:
                result.append(self._parse_child(indent))
                continue
            if _looks_like_key_value(item_text):
                key, raw_value = _split_key_value(item_text)
                item: dict[str, Any] = {key: self._parse_value(raw_value, indent, raw_index)}
                if self.index < len(self.lines) and self.lines[self.index][0] > indent:
                    child = self._parse_block(self.lines[self.index][0])
                    if isinstance(child, dict):
                        item.update(child)
                    else:
                        raise YAMLError(f"Expected mapping after list item at line {self.index + 1}")
                result.append(item)
            else:
                result.append(_parse_scalar(item_text))
        return result

    def _parse_value(self, raw_value: str, indent: int, raw_index: int) -> Any:
        raw_value = raw_value.strip()
        if raw_value in {"|", ">"}:
            return self._parse_block_scalar(indent, folded=raw_value == ">", raw_index=raw_index)
        if raw_value == "":
            return self._parse_child(indent)
        return _parse_scalar(raw_value)

    def _parse_child(self, indent: int) -> Any:
        if self.index >= len(self.lines):
            return {}
        next_indent, next_content, _, _ = self.lines[self.index]
        if next_indent == indent and (next_content.startswith("- ") or next_content == "-"):
            return self._parse_block(next_indent)
        if next_indent <= indent:
            return {}
        return self._parse_block(self.lines[self.index][0])

    def _parse_block_scalar(self, indent: int, folded: bool, raw_index: int) -> str:
        parts: list[str] = []
        cursor = raw_index + 1
        while cursor < len(self.raw_lines):
            raw = self.raw_lines[cursor].rstrip("\r\n")
            stripped = raw.lstrip(" ")
            line_indent = len(raw) - len(stripped)
            if stripped and line_indent <= indent:
                break
            parts.append(raw)
            cursor += 1

        while self.index < len(self.lines) and self.lines[self.index][3] < cursor:
            self.index += 1

        nonempty_indents = [len(line) - len(line.lstrip(" ")) for line in parts if line.strip()]
        if not nonempty_indents:
            return ""
        min_indent = min(nonempty_indents)
        stripped = [part[min_indent:] if part.strip() else "" for part in parts]
        if folded:
            return _fold_block_scalar(stripped)
        return "\n".join(stripped)


def _strip_inline_comment(text: str) -> str:
    in_single = False
    in_double = False
    escaped = False
    for index, char in enumerate(text):
        if escaped:
            escaped = False
            continue
        if char == "\\" and in_double:
            escaped = True
            continue
        if char == "'" and not in_double:
            in_single = not in_single
            continue
        if char == '"' and not in_single:
            in_double = not in_double
            continue
        if char == "#" and not in_single and not in_double:
            if index == 0 or text[index - 1].isspace():
                return text[:index].rstrip()
    return text


def _looks_like_key_value(text: str) -> bool:
    try:
        key, _ = _split_key_value(text)
    except YAMLError:
        return False
    return bool(key)


def _split_key_value(text: str) -> tuple[str, str]:
    in_single = False
    in_double = False
    escaped = False
    for index, char in enumerate(text):
        if escaped:
            escaped = False
            continue
        if char == "\\" and in_double:
            escaped = True
            continue
        if char == "'" and not in_double:
            in_single = not in_single
            continue
        if char == '"' and not in_single:
            in_double = not in_double
            continue
        if char == ":" and not in_single and not in_double:
            key = text[:index].strip()
            value = text[index + 1 :].strip()
            if not key:
                raise YAMLError(f"Missing key in line: {text}")
            return _unquote_key(key), value
    raise YAMLError(f"Expected key/value pair: {text}")


def _unquote_key(key: str) -> str:
    if len(key) >= 2 and key[0] == key[-1] and key[0] in {'"', "'"}:
        return str(ast.literal_eval(key))
    return key


def _parse_scalar(raw: str) -> Any:
    value = raw.strip()
    if value == "":
        return ""
    lowered = value.lower()
    if lowered in {"null", "none", "~"}:
        return None
    if lowered == "true":
        return True
    if lowered == "false":
        return False
    if value in {"[]", "{}"}:
        return [] if value == "[]" else {}
    if len(value) >= 2 and value[0] == value[-1] == "'":
        return value[1:-1].replace("''", "'")
    if len(value) >= 2 and value[0] == value[-1] == '"':
        try:
            return ast.literal_eval(value)
        except (SyntaxError, ValueError) as exc:
            raise YAMLError(f"Invalid quoted scalar: {value}") from exc
    if value.startswith("[") != value.endswith("]"):
        raise YAMLError(f"Invalid inline list: {value}")
    if value.startswith("[") and value.endswith("]"):
        inner = value[1:-1].strip()
        return [] if not inner else [_parse_scalar(part) for part in _split_inline(inner)]
    if value.startswith("{") != value.endswith("}"):
        raise YAMLError(f"Invalid inline mapping: {value}")
    if value.startswith("{") and value.endswith("}"):
        inner = value[1:-1].strip()
        result: dict[str, Any] = {}
        if inner:
            for part in _split_inline(inner):
                key, item_value = _split_key_value(part)
                result[key] = _parse_scalar(item_value)
        return result
    if re.fullmatch(r"[-+]?\d+", value):
        try:
            return int(value)
        except ValueError:
            pass
    if re.fullmatch(r"[-+]?(?:\d+\.\d*|\d*\.\d+)", value):
        try:
            return float(value)
        except ValueError:
            pass
    return value


def _split_inline(text: str) -> list[str]:
    parts: list[str] = []
    start = 0
    depth = 0
    in_single = False
    in_double = False
    escaped = False
    for index, char in enumerate(text):
        if escaped:
            escaped = False
            continue
        if char == "\\" and in_double:
            escaped = True
            continue
        if char == "'" and not in_double:
            in_single = not in_single
            continue
        if char == '"' and not in_single:
            in_double = not in_double
            continue
        if in_single or in_double:
            continue
        if char in "[{":
            depth += 1
        elif char in "]}":
            depth -= 1
        elif char == "," and depth == 0:
            parts.append(text[start:index].strip())
            start = index + 1
    parts.append(text[start:].strip())
    return parts


def _fold_block_scalar(lines: list[str]) -> str:
    """Implement YAML folded-scalar (`>`) behavior with blank lines preserved as paragraph breaks."""
    paragraphs: list[str] = []
    current: list[str] = []
    for line in lines:
        if line == "":
            if current:
                paragraphs.append(" ".join(part.strip() for part in current))
                current = []
            paragraphs.append("")
            continue
        current.append(line)
    if current:
        paragraphs.append(" ".join(part.strip() for part in current))
    return "\n".join(paragraphs)


def _dump_value(value: Any, indent: int, sort_keys: bool, allow_unicode: bool) -> str:
    if isinstance(value, dict):
        return _dump_mapping(value, indent, sort_keys, allow_unicode)
    if isinstance(value, list):
        return _dump_list(value, indent, sort_keys, allow_unicode)
    return " " * indent + _format_scalar(value, allow_unicode)


def _dump_mapping(data: dict[Any, Any], indent: int, sort_keys: bool, allow_unicode: bool) -> str:
    lines: list[str] = []
    keys: Iterable[Any] = sorted(data) if sort_keys else data.keys()
    prefix = " " * indent
    for key in keys:
        value = data[key]
        formatted_key = _format_key(key, allow_unicode)
        if value == []:
            lines.append(f"{prefix}{formatted_key}: []")
        elif value == {}:
            lines.append(f"{prefix}{formatted_key}: {{}}")
        elif isinstance(value, (dict, list)):
            lines.append(f"{prefix}{formatted_key}:")
            lines.append(_dump_value(value, indent + 2, sort_keys, allow_unicode))
        else:
            lines.append(f"{prefix}{formatted_key}: {_format_scalar(value, allow_unicode)}")
    return "\n".join(lines)


def _dump_list(data: list[Any], indent: int, sort_keys: bool, allow_unicode: bool) -> str:
    lines: list[str] = []
    prefix = " " * indent
    for item in data:
        if item == []:
            lines.append(f"{prefix}- []")
        elif item == {}:
            lines.append(f"{prefix}- {{}}")
        elif isinstance(item, dict):
            keys = list(sorted(item) if sort_keys else item.keys())
            first_key = keys[0] if keys else None
            first_value = item[first_key] if first_key is not None else None
            if first_key is not None and not isinstance(first_value, (dict, list)):
                lines.append(f"{prefix}- {_format_key(first_key, allow_unicode)}: {_format_scalar(first_value, allow_unicode)}")
                rest = {key: item[key] for key in keys[1:]}
                if rest:
                    lines.append(_dump_mapping(rest, indent + 2, sort_keys, allow_unicode))
            else:
                lines.append(f"{prefix}-")
                lines.append(_dump_value(item, indent + 2, sort_keys, allow_unicode))
        elif isinstance(item, list):
            lines.append(f"{prefix}-")
            lines.append(_dump_value(item, indent + 2, sort_keys, allow_unicode))
        else:
            lines.append(f"{prefix}- {_format_scalar(item, allow_unicode)}")
    return "\n".join(lines)


def _format_scalar(value: Any, allow_unicode: bool) -> str:
    if value is None:
        return "null"
    if value is True:
        return "true"
    if value is False:
        return "false"
    if isinstance(value, (int, float)):
        return str(value)
    text = str(value)
    if not allow_unicode and not text.isascii():
        return json.dumps(text, ensure_ascii=True)
    if "\n" in text:
        return "|\n" + "\n".join(f"  {line}" for line in text.splitlines())
    if text == "" or text.strip() != text or text.lower() in {"true", "false", "null", "none", "~"}:
        return _quote_scalar(text)
    if any(char in text for char in [": ", "#", "[", "]", "{", "}", ","]):
        return _quote_scalar(text)
    return text


def _format_key(key: Any, allow_unicode: bool) -> str:
    text = str(key)
    if not allow_unicode and not text.isascii():
        return json.dumps(text, ensure_ascii=True)
    if (
        text == ""
        or text.strip() != text
        or any(char in text for char in [":", "#", "[", "]", "{", "}", ","])
        or text.lower() in {"true", "false", "null", "none", "~"}
    ):
        return _quote_scalar(text)
    return text


def _quote_scalar(text: str) -> str:
    """Return a YAML 1.2 single-quoted scalar, escaping internal single quotes by doubling them."""
    return "'" + text.replace("'", "''") + "'"
