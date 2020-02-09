# 🌼 Pollen for Cloud V
An SoC JSON to Verilog generator.

# Development Dependencies
Node.js LTS, NPM.

```bash
    # macOS
    brew install node

    # Linux
    curl -L https://git.io/n-install | bash

    # Both, after n is installed
    n lts
```

# Usage
## First time
```bash
    npm i
```

## Top Level Module Generation
Taking an SoC JSON, it generates a Verilog file for a top level SoC, with module instantiation, port analysis and much more being taken care of.

```bash
    # Execute
    npm run pollen -- -o soc.v Samples/drv32_ahbl.json

    # Test Parse
    iverilog Samples/cloudv/AHBL_MEM/memory.v Samples/cloudv/AHBL_IO/io.v Samples/cloudv/AHBL_dwarfRV32/regfile.v Samples/cloudv/AHBL_dwarfRV32/rv32.v Samples/cloudv/AHBL_dwarfRV32/drv32_ahbl.v soc.v
```
## Validation of Bus Compliance
This tool validates an IP's compliance with a certain bus. Buses are represented as a json file under **Buses**: each bus has a corresponding manifest.json.

```bash
    # Execute
    npm run pollen -- -v AHB-Lite -m AHBL_dwarfRV32 -s master Samples/cloudv/AHBL_dwarfRV32/drv32_ahbl.v
```

# ⚖️ License
The GNU General Public License v3, or at your option, any later version. Check 'License'.