"""Minimal built-in YAML compatibility layer for Lens scripts.

Supports the practical YAML subset used in repo config and artifact files so
focused tests can run without PyYAML.
"""

from __future__ import annotations

import json
import re
from collections.abc import Iterator
from typing import Any, TextIO


class YAMLError(ValueError):
    pass


def _strip_comment(line: str) -> str:
    in_quote: str | None = None
    escaped = False
    for index, char in enumerate(line):
        if escaped:
            escaped = False
            continue
        if char == "\\" and in_quote == '"':
            escaped = True
            continue
        if char in {"'", '"'}:
            if in_quote == char:
                in_quote = None
            elif in_quote is None:
                in_quote = char
            continue
        is_comment_start = index == 0 or line[index - 1].isspace()
        if char == "#" and in_quote is None and is_comment_start:
            return line[:index].rstrip()
    return line.rstrip()


def _split_top_level(text: str, separator: str = ",") -> list[str]:
    parts: list[str] = []
    current: list[str] = []
    in_quote: str | None = None
    escaped = False
    depth = 0
    for char in text:
        if escaped:
            current.append(char)
            escaped = False
            continue
        if char == "\\" and in_quote == '"':
            current.append(char)
            escaped = True
            continue
        if char in {"'", '"'}:
            current.append(char)
            if in_quote == char:
                in_quote = None
            elif in_quote is None:
                in_quote = char
            continue
        if in_quote is None:
            if char in "[{(":
                depth += 1
            elif char in "]})":
                depth -= 1
            elif char == separator and depth == 0:
                parts.append("".join(current).strip())
                current = []
                continue
        current.append(char)
    tail = "".join(current).strip()
    if tail:
        parts.append(tail)
    return parts


def _split_key_value(text: str) -> tuple[str, str]:
    in_quote: str | None = None
    escaped = False
    depth = 0
    for index, char in enumerate(text):
        if escaped:
            escaped = False
            continue
        if char == "\\" and in_quote == '"':
            escaped = True
            continue
        if char in {"'", '"'}:
            if in_quote == char:
                in_quote = None
            elif in_quote is None:
                in_quote = char
            continue
        if in_quote is None:
            if char in "[{(":
                depth += 1
            elif char in "]})":
                depth -= 1
            elif char == ":" and depth == 0:
                return text[:index].strip(), text[index + 1 :].strip()
    raise YAMLError(f"invalid mapping item: {text}")


def _parse_scalar(text: str) -> Any:
    value = text.strip()
    if value in ("null", "Null", "NULL", "~", ""):
        return None
    if value in ("true", "True", "TRUE"):
        return True
    if value in ("false", "False", "FALSE"):
        return False
    if value.startswith("[") and value.endswith("]"):
        inner = value[1:-1].strip()
        return [] if not inner else [_parse_scalar(part) for part in _split_top_level(inner)]
    if value.startswith("{") and value.endswith("}"):
        inner = value[1:-1].strip()
        if not inner:
            return {}
        result: dict[str, Any] = {}
        for part in _split_top_level(inner):
            key, item_value = _split_key_value(part)
            result[str(_parse_scalar(key))] = _parse_scalar(item_value)
        return result
    if (value.startswith('"') and value.endswith('"')) or (
        value.startswith("'") and value.endswith("'")
    ):
        if value.startswith('"'):
            try:
                return json.loads(value)
            except json.JSONDecodeError:
                return value[1:-1]
        return value[1:-1]
    if re.fullmatch(r"-?\d+", value):
        try:
            return int(value)
        except ValueError:
            pass
    if re.fullmatch(r"-?\d+\.\d+", value):
        try:
            return float(value)
        except ValueError:
            pass
    return value


def _source_text(src: Any) -> str:
    if hasattr(src, "read"):
        src = src.read()
    if isinstance(src, bytes):
        src = src.decode("utf-8")
    if not isinstance(src, str):
        raise YAMLError("safe_load expects a string, bytes, or file-like object")
    return src


def _normalise_source(src: Any) -> list[str]:
    src = _source_text(src)

    lines: list[str] = []
    for raw in src.splitlines():
        line = _strip_comment(raw.rstrip("\n"))
        if line.strip():
            lines.append(line.rstrip())
    return lines


def _line_indent(line: str) -> int:
    return len(line) - len(line.lstrip(" "))


def _is_nested_value_line(parent_indent: int, line: str) -> bool:
    """Allow nested values under `key:` including same-indent list shorthand accepted by PyYAML."""
    line_indent = _line_indent(line)
    return line_indent > parent_indent or (line_indent == parent_indent and line.strip().startswith("- "))


def _parse_block(lines: list[str], index: int, indent: int) -> tuple[Any, int]:
    if index >= len(lines):
        return None, index

    current_indent = _line_indent(lines[index])
    if current_indent < indent:
        return None, index
    indent = current_indent
    is_list = lines[index].strip().startswith("- ")
    return _parse_list(lines, index, indent) if is_list else _parse_mapping(lines, index, indent)


def _parse_list(lines: list[str], index: int, indent: int) -> tuple[list[Any], int]:
    result: list[Any] = []
    while index < len(lines):
        line = lines[index]
        current_indent = _line_indent(line)
        if current_indent < indent:
            break
        if current_indent > indent:
            raise YAMLError(f"unexpected indentation: {line.strip()}")

        content = line.strip()
        if not content.startswith("- "):
            break

        item = content[2:].strip()
        index += 1
        if not item:
            if index < len(lines) and _line_indent(lines[index]) > indent:
                value, index = _parse_block(lines, index, _line_indent(lines[index]))
                result.append(value)
            else:
                result.append(None)
            continue

        if ":" in item and not item.startswith(('"', "'")):
            key, raw_value = _split_key_value(item)
            obj: dict[str, Any] = {}
            if raw_value:
                obj[key] = _parse_scalar(raw_value)
            elif index < len(lines) and _line_indent(lines[index]) > indent:
                obj[key], index = _parse_block(lines, index, _line_indent(lines[index]))
            else:
                obj[key] = None

            while index < len(lines) and _line_indent(lines[index]) > indent:
                extra_indent = _line_indent(lines[index])
                extra = lines[index].strip()
                if extra.startswith("- "):
                    raise YAMLError(f"unexpected list item: {extra}")
                extra_key, extra_value = _split_key_value(extra)
                index += 1
                if extra_value:
                    obj[extra_key] = _parse_scalar(extra_value)
                elif index < len(lines) and _line_indent(lines[index]) > extra_indent:
                    obj[extra_key], index = _parse_block(lines, index, _line_indent(lines[index]))
                else:
                    obj[extra_key] = None
            result.append(obj)
        else:
            result.append(_parse_scalar(item))
    return result, index


def _parse_mapping(lines: list[str], index: int, indent: int) -> tuple[dict[str, Any], int]:
    result: dict[str, Any] = {}
    while index < len(lines):
        line = lines[index]
        current_indent = _line_indent(line)
        if current_indent < indent:
            break
        if current_indent > indent:
            raise YAMLError(f"unexpected indentation: {line.strip()}")

        content = line.strip()
        if content.startswith("- "):
            break
        key, raw_value = _split_key_value(content)
        index += 1
        if raw_value:
            result[key] = _parse_scalar(raw_value)
        elif index < len(lines) and _is_nested_value_line(indent, lines[index]):
            result[key], index = _parse_block(lines, index, _line_indent(lines[index]))
        else:
            result[key] = None
    return result, index


def safe_load(src: Any) -> Any:
    lines = _normalise_source(src)
    if not lines:
        return None
    data, index = _parse_block(lines, 0, _line_indent(lines[0]))
    if index != len(lines):
        raise YAMLError(f"could not parse line: {lines[index].strip()}")
    return data


def safe_load_all(src: Any) -> Iterator[Any]:
    """Yield parsed YAML documents separated by `---`/`...` markers."""
    text = _source_text(src)
    current: list[str] = []

    for raw in text.splitlines():
        marker = raw.strip()
        if marker in {"---", "..."}:
            if current:
                yield safe_load("\n".join(current))
                current = []
            continue
        current.append(raw)

    if current:
        yield safe_load("\n".join(current))


def _scalar(value: Any) -> str:
    if value is None:
        return "null"
    if isinstance(value, bool):
        return "true" if value else "false"
    if isinstance(value, (int, float)):
        return str(value)
    text = str(value)
    if (
        text == ""
        or any(char in text for char in ":#\n[]{}")
        or text.strip() != text
        or re.search(r"\s{2,}", text)
    ):
        return json.dumps(text)
    return text


def _dump(obj: Any, indent: int = 0) -> list[str]:
    spaces = " " * indent
    if isinstance(obj, dict):
        out: list[str] = []
        for key, value in obj.items():
            if isinstance(value, (dict, list)):
                out.append(f"{spaces}{key}:")
                out.extend(_dump(value, indent + 2))
            else:
                out.append(f"{spaces}{key}: {_scalar(value)}")
        return out
    if isinstance(obj, list):
        out = []
        for item in obj:
            if isinstance(item, dict):
                if not item:
                    out.append(f"{spaces}- {{}}")
                    continue
                first = True
                for key, value in item.items():
                    prefix = "-" if first else " "
                    if isinstance(value, (dict, list)):
                        out.append(f"{spaces}{prefix} {key}:")
                        out.extend(_dump(value, indent + 2))
                    else:
                        out.append(f"{spaces}{prefix} {key}: {_scalar(value)}")
                    first = False
            elif isinstance(item, list):
                out.append(f"{spaces}-")
                out.extend(_dump(item, indent + 2))
            else:
                out.append(f"{spaces}- {_scalar(item)}")
        return out
    return [f"{spaces}{_scalar(obj)}"]


def safe_dump(data: Any, stream: TextIO | None = None, *args: Any, **kwargs: Any) -> str | None:
    """Render YAML, accepting and ignoring extra PyYAML dump options."""
    rendered = "\n".join(_dump(data)) + "\n"
    if stream is not None:
        stream.write(rendered)
        return None
    return rendered


def dump(data: Any, stream: TextIO | None = None, *args: Any, **kwargs: Any) -> str | None:
    return safe_dump(data, stream, *args, **kwargs)
