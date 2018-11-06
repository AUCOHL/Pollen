# 🌼 Pollen for Cloud V
An SoC JSON to Verilog generator.

# Development Dependencies
Node.js, NPM.

```bash
    # macOS
    brew install node

    # Linux
    sudo apt-get install nodejs npm
    sudo ln -s /usr/bin/nodejs /usr/bin/node
```

# Building
```bash
    # Compile
    npm install
    make
```

# Usage
## Top Level Module Generation
Taking an SoC JSON, it generates a Verilog file for a top level SoC, with module instantiation, port analysis and much more being taken care of.

```bash
    # Execute
    node pollen.js Samples/drv32_ahbl.json > soc.v

    # Test Parse
    iverilog Samples/cloudv/AHBL_MEM/memory.v Samples/cloudv/AHBL_IO/io.v Samples/cloudv/AHBL_dwarfRV32/regfile.v Samples/cloudv/AHBL_dwarfRV32/rv32.v Samples/cloudv/AHBL_dwarfRV32/drv32_ahbl.v soc.v
```
## Validation of Bus Compliance
This tool validates an IP's compliance with a certain bus. Buses are represented as a json file under **Buses**: each bus has a corresponding manifest.json.

```bash
    # Execute
    node pollen.js -v AHB-Lite -m AHBL_dwarfRV32 -s master Samples/cloudv/AHBL_dwarfRV32/drv32_ahbl.v
```

# ⚖️ License
The GNU General Public License v3, or at your option, any later version. Check 'License'.