# Draw Something AWESOME!


**Draw Something AWESOME!** is an AI-powered interactive drawing board that combines a Python FastAPI backend with a modern JavaScript frontend. The system integrates LLM-driven agents, built-in toolchains, and MCP examples to enable intelligent drawing assistance directly in the browser. The backend serves as a fast, lightweight API layer, while the frontend manages agent logic, tool execution, and real-time interactions. The project features a clean modular structure, support for custom LLM providers, and a growing testing suite—making it a solid foundation for experimenting with AI-driven creative tools.

## backend
```
python backend.py
```

## frontend
```
npm run dev
```

![banner](demo.png)

## project structure
```
project/
├── 📄 README.md                    # This file
├── 🔧 backend.py                   # Backend api/endpoint
├── 🔐 .env.example                 # Environment template
├── 📦 requirements.txt             # Python dependencies
│
├── 📁 frontend/src/                # Framework
│   ├── 🤖 agents/                  # Agent implementations
│   ├── 🛠️ tools/                   # Built-in tools
│   ├── 🧠 llm/                     # LLM providers & management
│   └── 🔌 mcp/                     # MCP tool examples
│
└── 📁 tests/                       # Test suite
    ├── 🧪 test_agents.py
    └── 🧪 test_tools.py
```

## checklist ✅
- [x] Connection management
- [x] FastAPI
- [x] Message/prompt protocol
- [x] LLM core plugin
- [x] FastMCP server
- [ ] Testing suite

## keywords

ai agent powered drawing board
