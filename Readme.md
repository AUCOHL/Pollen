# Pollen
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
```bash
    # Execute
    node pollen.js Samples/drv32_ahbl.json > soc.v

    # Test Parse
    iverilog Samples/cloudv/AHBL_MEM/memory.v Samples/cloudv/AHBL_IO/io.v Samples/cloudv/AHBL_dwarfRV32/regfile.v Samples/cloudv/AHBL_dwarfRV32/rv32.v Samples/cloudv/AHBL_dwarfRV32/drv32_ahbl.v soc.v
```
## Validation of Bus Compliance
```bash
    # Execute
    node pollen.js -v AHB-Lite -m AHBL_dwarfRV32 -s master Samples/cloudv/AHBL_dwarfRV32/drv32_ahbl.v
```