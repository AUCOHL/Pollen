`define B0_BOUND 7:0 
`define B1_BOUND 15:8 
`define B2_BOUND 23:16
`define B3_BOUND 31:24

module AHBL_MEM
(
    input               HSEL,
    input               HCLK,
    input               HRESETn,
    input  [1:0]        HTRANS,
    input  [31:0]       HADDR,
    input  [31:0]       HWDATA,
    input  [2:0]        HSIZE,                  // [2:0]
    input  [2:0]        HBURST,
    input  [3:0]        HPROT,
    input               HMASTLOCK,
    input               HWRITE,
    input               HREADY,

    output              HRESP,
    output              HREADYOUT,
    output  reg [31:0]  HRDATA

);
parameter CV_CONFIGURATION_MEMWIDTH = 10; 					// SIZE = 1KB = 256 Words
parameter CV_BASEADDRESS = "0";
localparam MEMWIDTH = CV_CONFIGURATION_MEMWIDTH;


// Registers to store Adress Phase Signals

  reg APhase_HSEL;
  reg APhase_HWRITE;
  reg [1:0] APhase_HTRANS;
  reg [31:0] APhase_HADDR;
  reg [2:0] APhase_HSIZE;

// Memory Array
  reg [31:0] memory[0:(2**(MEMWIDTH-2)-1)]
	/* synthesis syn_ramstyle = "rw_check" */ ;

  initial
  begin
      $readmemh({"./bin_", CV_BASEADDRESS, ".hex"}, memory);
  end

// Sample the Address Phase
  always @(posedge HCLK or negedge HRESETn)
  begin
	 if(!HRESETn)
	 begin
		APhase_HSEL <= 1'b0;
		 APhase_HWRITE <= 1'b0;
		 APhase_HTRANS <= 2'b00;
		APhase_HADDR <= 32'h0;
		APhase_HSIZE <= 3'b000;
	 end
    else if(HREADY | WAIT)
    begin
		APhase_HSEL <= HSEL;
		APhase_HWRITE <= HWRITE;
		APhase_HTRANS <= HTRANS;
		APhase_HADDR <= HADDR;
		APhase_HSIZE <= HSIZE;
    end
  end

// Decode the bytes lanes depending on HSIZE & HADDR[1:0]

  wire tx_byte = ~APhase_HSIZE[1] & ~APhase_HSIZE[0];
  wire tx_half = ~APhase_HSIZE[1] &  APhase_HSIZE[0];
  wire tx_word =  APhase_HSIZE[1];

  wire byte_at_00 = tx_byte & ~APhase_HADDR[1] & ~APhase_HADDR[0];
  wire byte_at_01 = tx_byte & ~APhase_HADDR[1] &  APhase_HADDR[0];
  wire byte_at_10 = tx_byte &  APhase_HADDR[1] & ~APhase_HADDR[0];
  wire byte_at_11 = tx_byte &  APhase_HADDR[1] &  APhase_HADDR[0];

  wire half_at_00 = tx_half & ~APhase_HADDR[1];
  wire half_at_10 = tx_half &  APhase_HADDR[1];

  wire word_at_00 = tx_word;

  wire byte0 = word_at_00 | half_at_00 | byte_at_00;
  wire byte1 = word_at_00 | half_at_00 | byte_at_01;
  wire byte2 = word_at_00 | half_at_10 | byte_at_10;
  wire byte3 = word_at_00 | half_at_10 | byte_at_11;

// Writing to the memory

  always @(posedge HCLK)
  begin
	 if(APhase_HSEL & APhase_HWRITE & APhase_HTRANS[1])
	 begin
		if(byte0)
			memory[APhase_HADDR[MEMWIDTH-1:2]][7:0] <= HWDATA[7:0];
		if(byte1)
			memory[APhase_HADDR[MEMWIDTH-1:2]][15:8] <= HWDATA[15:8];
		if(byte2)
			memory[APhase_HADDR[MEMWIDTH-1:2]][23:16] <= HWDATA[23:16];
		if(byte3)
			memory[APhase_HADDR[MEMWIDTH-1:2]][31:24] <= HWDATA[31:24];
	  end
  end

  always @(posedge HCLK)
	  HRDATA <= memory[HADDR[MEMWIDTH-1:2]];

  wire CEWR = APhase_HWRITE & APhase_HSEL; //expect a write on this clock edge
  wire CERD = HSEL & ~HWRITE; 			 //expect a read on this clock edge
  
  wire MUTEX = CERD ^ CEWR;
  wire WAIT = CERD & CEWR;
  
  wire CE = MUTEX? 1'b1 : (WAIT? CEWR : 1'b0);
  
  assign HREADYOUT = ~WAIT;
// Reading from memory
  //assign HRDATA = memory[APhase_HADDR[MEMWIDTH:2]];

// Diagnostic Signal out

endmodule
