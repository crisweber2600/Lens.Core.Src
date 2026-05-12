"""Minimal built-in YAML compatibility layer for Lens scripts.
Supports a practical YAML subset used in repo config/artifact files.
"""
from __future__ import annotations
import json,re
from typing import Any

class YAMLError(ValueError):
    pass

def _parse_scalar(text:str)->Any:
    t=text.strip()
    if t in ('null','Null','NULL','~',''): return None
    if t in ('true','True','TRUE'): return True
    if t in ('false','False','FALSE'): return False
    if (t.startswith('"') and t.endswith('"')) or (t.startswith("'") and t.endswith("'")):
        return t[1:-1]
    if re.fullmatch(r'-?\d+',t):
        try:return int(t)
        except:pass
    if re.fullmatch(r'-?\d+\.\d+',t):
        try:return float(t)
        except:pass
    return t

def safe_load(src:str)->Any:
    lines=[ln.rstrip('\n') for ln in src.splitlines()]
    lines=[ln for ln in lines if ln.strip() and not ln.lstrip().startswith('#')]
    if not lines: return None
    stack=[]  # (indent, container)
    root=None

    def add_value(indent,key,val,is_list_item=False):
        nonlocal root
        while stack and indent < stack[-1][0]:
            stack.pop()
        if not stack:
            if is_list_item:
                if root is None: root=[]
                if not isinstance(root,list): raise YAMLError('mixed root types')
                root.append(val)
            elif key is None:
                root=val
            else:
                if root is None: root={}
                if not isinstance(root,dict): raise YAMLError('mixed root types')
                root[key]=val
            return
        parent=stack[-1][1]
        if isinstance(parent,dict):
            if key is None: raise YAMLError('list item under mapping without key')
            parent[key]=val
        elif isinstance(parent,list):
            if key is None:
                parent.append(val)
            else:
                obj={key:val}
                parent.append(obj)
                if isinstance(val,(dict,list)): return

    i=0
    while i < len(lines):
        ln=lines[i]
        indent=len(ln)-len(ln.lstrip(' '))
        content=ln.strip()
        while stack and indent < stack[-1][0]: stack.pop()

        if content.startswith('- '):
            item=content[2:].strip()
            if not stack or not isinstance(stack[-1][1],list) or indent>stack[-1][0]:
                new=[]
                if stack:
                    parent=stack[-1][1]
                    if isinstance(parent,dict):
                        # attach to last inserted key
                        if not parent: raise YAMLError('invalid list location')
                        k=next(reversed(parent.keys()))
                        if parent[k] in (None,''):
                            parent[k]=new
                        else:
                            raise YAMLError('cannot attach list')
                    elif isinstance(parent,list):
                        parent.append(new)
                else:
                    if root is None: root=new
                stack.append((indent,new))
            target=stack[-1][1]
            if ':' in item and not item.startswith(('"',"'")):
                k,v=item.split(':',1)
                k=k.strip(); v=v.strip()
                obj={k: _parse_scalar(v) if v else None}
                target.append(obj)
                if not v:
                    stack.append((indent+2,obj))
            elif item:
                target.append(_parse_scalar(item))
            else:
                obj={}
                target.append(obj)
                stack.append((indent+2,obj))
        else:
            if ':' not in content: raise YAMLError(f'invalid line: {content}')
            k,v=content.split(':',1)
            k=k.strip(); v=v.strip()
            val=_parse_scalar(v) if v else None
            if not stack:
                if root is None: root={}
                if not isinstance(root,dict): raise YAMLError('mixed root types')
                root[k]=val
                if not v:
                    # determine container later by children
                    root[k]={}
                    stack.append((indent+2,root[k]))
            else:
                parent=stack[-1][1]
                if isinstance(parent,list):
                    obj={k:val}
                    parent.append(obj)
                    if not v:
                        obj[k]={}
                        stack.append((indent+2,obj[k]))
                else:
                    parent[k]=val
                    if not v:
                        parent[k]={}
                        stack.append((indent+2,parent[k]))
        i+=1
    return root

def _dump(obj:Any,indent:int=0)->list[str]:
    sp=' '*indent
    if isinstance(obj,dict):
        out=[]
        for k,v in obj.items():
            if isinstance(v,(dict,list)):
                out.append(f"{sp}{k}:")
                out.extend(_dump(v,indent+2))
            else:
                out.append(f"{sp}{k}: { _scalar(v)}")
        return out
    if isinstance(obj,list):
        out=[]
        for it in obj:
            if isinstance(it,(dict,list)):
                out.append(f"{sp}-")
                out.extend(_dump(it,indent+2))
            else:
                out.append(f"{sp}- {_scalar(it)}")
        return out
    return [f"{sp}{_scalar(obj)}"]

def _scalar(v:Any)->str:
    if v is None:return 'null'
    if isinstance(v,bool): return 'true' if v else 'false'
    if isinstance(v,(int,float)): return str(v)
    s=str(v)
    if s=='' or any(c in s for c in ':#\n'):
        return json.dumps(s)
    return s

def safe_dump(data:Any,*_,**__)->str:
    return '\n'.join(_dump(data))+"\n"

def dump(data:Any,*a,**k)->str:
    return safe_dump(data,*a,**k)
