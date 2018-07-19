# Pollen

# Dependencies.
NPM, Typescript

```bash
    # macOS
    brew install node
    npm install

    # Linux
    sudo apt-get install nodejs npm
    sudo ln -s /usr/bin/nodejs /usr/bin/node
```

# Usage

```bash
    # Compile
    make

    # Execute
    node pollen.js Samples/drv32_ahbl.json > soc.v

    # Test Parse
    iverilog Samples/Cloud-V/AHB2MEM/*.v Samples/Cloud-V/AHBSLAVE_IO/io.v Samples/Cloud-V/AHBLdwarfRV32/regfile.v Samples/Cloud-V/AHBLdwarfRV32/rv32.v Samples/Cloud-V/AHBLdwarfRV32/drv32_ahbl.v soc.v
```