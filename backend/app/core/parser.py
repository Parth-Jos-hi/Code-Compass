import os
import re
# Comprehensive list of folders to skip to keep the scanning process local and lightweight
IGNORE_DIRS = {
    ".git", 
    "node_modules", 
    "__pycache__", 
    ".venv", 
    "env", 
    ".next", 
    "build", 
    "dist", 
    ".cache"
}
# Explicit mapping of all important configuration, backend, and frontend files
SUPPORTED_EXTENSIONS = {
    # Backend Architectures
    ".py": "Python",
    ".java": "Java",
    ".cpp": "C++",
    ".hpp": "C++",
    ".h": "C++",
    ".c": "C",
    # Frontend Ecosystem (Next.js / React)
    ".tsx": "TypeScript (React)",
    ".ts": "TypeScript",
    ".jsx": "JavaScript (React)",
    ".js": "JavaScript",
    # Styling and Core Configuration Assets
    ".css": "CSS Stylesheet",
    ".json": "JSON Configuration",
    ".env": "Environment Configurations",
    ".local": "Local Environment Configurations",
    # System & Deployment Files
    ".dockerfile": "Docker Configuration",
    "Dockerfile": "Docker Configuration"
}
def scan_local_repository(repo_path:str)->list:
    discovered_files = []
    for root,dirs,files in os.walk(repo_path):
        dirs[:] = [d for d in dirs if d not in IGNORE_DIRS]
        for file in files:
            file_ext = os.path.splitext(file)[1]
            file_type = SUPPORTED_EXTENSIONS.get(file_ext) or SUPPORTED_EXTENSIONS.get(file)
            if file_type:
                full_path = os.path.join(root, file)
                relative_path = os.path.relpath(full_path, repo_path)
                try:
                    with open(full_path, 'r', encoding='utf-8') as f:
                        code_content = f.read()
                        discovered_files.append({
                        "file_path": relative_path,
                        "language": file_type,
                        "content": code_content
                    })
                except Exception:
                    # Silently ignore binary components or locked system files
                    continue
    return discovered_files
def extract_dependencies(content:str,language:str)->list:
    """
    Scans file content using regular expressions to find structural imports.
    Helps build the lines (edges) in your 3D graph constellation.
    """
    dependencies = []
    if language == "Python":
        matches = re.findall(r'^\s*(?:import|from)\s+([a-zA-Z0-9_\.]+)', content, re.MULTILINE)
        for match in matches:
            dependencies.append(match.split('.')[0])
    # 2. Matches Frontend TSX/TS/JS imports: 'import Navbar from "../components/Navbar"'
    elif language in ["TypeScript (React)", "TypeScript", "JavaScript (React)", "JavaScript"]:
        matches = re.findall(r'from\s+[\'"]([\w\.\-/]+)[\'"]', content)
        for dep in matches:
            # Grabs clean filename out of relative paths
            dependencies.append(os.path.basename(dep))

    # 3. Matches Java imports: 'import java.util.List;'
    elif language == "Java":
        matches = re.findall(r'^import\s+([\w\.]+);', content, re.MULTILINE)
        for dep in matches:
            dependencies.append(dep.split('.')[-1]) # Grab target class name

    # 4. Matches C++ includes: '#include "config.h"' or '#include <vector>'
    elif language == "C++":
        matches = re.findall(r'#include\s+[\'"<]([\w\.\-/]+)[\'">]', content)
        for dep in matches:
            dependencies.append(os.path.basename(dep))

    return list(set(dependencies))
def chunk_code_file(content: str, chunk_size: int = 1000, overlap: int = 200) -> list:
    """
    Slices raw code files into overlapping text blocks.
    Uses precise character matching to ensure context transitions smoothly.
    """
    chunks = []
    start_idx = 0
    content_len = len(content)

    # If the entire file is smaller than our target chunk size, just return it whole
    if content_len <= chunk_size:
        return [content]

    while start_idx < content_len:
        # Calculate where the current text chunk should ideally end
        end_idx = start_idx + chunk_size
        chunk_text = content[start_idx:end_idx]
        
        chunks.append(chunk_text)
        
        # Advance our starting pointer forward by subtracting the overlap factor
        start_idx += (chunk_size - overlap)
        
        # Guard condition: If the remaining text is smaller than our overlap window, we are done
        if start_idx >= content_len - overlap:
            remaining_text = content[start_idx:]
            if remaining_text.strip(): # Only save if it's not empty whitespace
                chunks.append(remaining_text)
            break
            
    return chunks

    
    
