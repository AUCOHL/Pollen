module AHBL_dwarfRV32 (
    input HCLK, HRESETn,

    input [31:0]    HRDATA,
    input           HREADY,
    input [1:0]     HRESP,                //for errors 

    output [31:0]   HADDR,
    output [2:0]    HSIZE,
    output [2:0]    HBURST,
    output [3:0]    HPROT,
    output          HMASTLOCK,
    output          HTRANS,                 //current transfer type
    output [31:0]   HWDATA,
    output          HWRITE,

	input  [15:0] INT,
    output simdone
);
parameter CV_CONFIGURATION_ENABLE_MUL_EXTENSION = 0;

    localparam IDLE     = 1'b0;             // no transfer needed
    localparam NONSEQ   = 1'b1;             // single / burst initial 
    
    localparam SZ_BYTE = 2'b00;
    localparam SZ_HW   = 2'b01;
    localparam SZ_W    = 2'b10;

    //localparam BUSY     = 2'b01;          //for burst
    //localparam SEQ      = 2'b11;
    
    //cpu here driving HWDATA and HADDR, HSIZE, HWRITE, .brdy(HREADY), 
	wire[4:0] rfrd, rfrs1, rfrs2;
	wire rfwr;
	wire[31:0] rfD;
	wire[31:0] rfRS1, rfRS2;
	//wire simdone;

	generate
		if (CV_CONFIGURATION_ENABLE_MUL_EXTENSION) begin : ext_wires
			wire[31:0] extA, extB;
			wire[31:0] extR;
			wire extStart;
			wire extDone;
			wire[2:0] extFunc3;
		end
	endgenerate

	wire IRQ;
	wire [3:0] IRQnum;
	wire [15:0] IRQen;


    rv32_CPU_v2 CPU(
		.clk(HCLK),
		.rst(~HRESETn),
		.bdi(HWDATA), .bdo(HRDATA), .baddr(HADDR), .bsz(HSIZE), .bwr(HWRITE),
		.brdy(HREADY),

		.rfwr(rfwr), .rfrd(rfrd), .rfrs1(rfrs1), .rfrs2(rfrs2), .rfD(rfD), .rfRS1(rfRS1), .rfRS2(rfRS2),

`ifdef _EN_EXT_
.extA(extA), .extB(extB), .extR(extR), .extStart(extStart), .extDone(extDone), .extFunc3(extFunc3),
`endif

		.IRQ(IRQ), .IRQnum(IRQnum), .IRQen(IRQen),

		.simdone(simdone)
	);
    
    //to rework if needed
    assign HTRANS = NONSEQ;    

	IntCtrl INTCU(
		.clk(HCLK), .rst(~HRESETn),
		.INT(INT), .IRQen(IRQen),
		.IRQ(IRQ), .IRQnum(IRQnum)
	);
	generate
	if (CV_CONFIGURATION_ENABLE_MUL_EXTENSION) begin : extinstance
		mul MULEXT (
			.clk(HCLK),
			.rst(~HRESETn),
			.done(extDone),
			.start(extStart),
			.a(extA), .b(extB),
			.p(extR)
		);
	end
	else begin : extsubstitute
		assign extA = 32'd0;
		assign extB = 32'd0;
		assign extStart = 1'b0;
	end
	endgenerate

	// simulate the RF
    regFile RF (.clk(HCLK), .rst(~HRESETn),
               .rfwr(rfwr),	
               .rfrd(rfrd), .rfrs1(rfrs1), .rfrs2(rfrs2),
               .rfD(rfD), .rfRS1(rfRS1), .rfRS2(rfRS2)

			   ,.simdone(simdone)
   );
    
      
    //extensions here

endmodule

