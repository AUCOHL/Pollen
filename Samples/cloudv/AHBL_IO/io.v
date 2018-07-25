module AHBL_IO (
    input               HSEL,
    input               HCLK,
    input               HRESETn,
    input  [1:0]        HTRANS,
    input  [31:0]       HADDR,
    input  [31:0]       HWDATA,
    input  [2:0]        HSIZE,
    input  [2:0]        HBURST,
    input  [3:0]        HPROT,
    input               HMASTLOCK,
    input               HWRITE,
    input               HREADY,

    output              HRESP,
    output              HREADYOUT,
    output  [31:0]      HRDATA,

    output reg [31:0]    strg
);

  reg last_HSEL;
  reg last_HWRITE;
  reg last_HTRANS;

  always@ (posedge HCLK, negedge HRESETn)
  begin
	  if(!HRESETn) begin
		  last_HSEL     <= 1'b0;
		  last_HWRITE   <= 1'b0;
		  last_HTRANS   <= 1'b0;
	  end
	  else if(HREADY)
    begin
      last_HSEL     <= HSEL;
      last_HWRITE   <= HWRITE;
      last_HTRANS   <= HTRANS;
    end
  end

  always@ (posedge HCLK, negedge HRESETn)
  begin
    if(!HRESETn)
      strg <= 32'd0;
    else if(last_HSEL & last_HWRITE & last_HTRANS)
      strg <= HWDATA[31:0];
  end


  assign HREADYout = 1'b1;
  assign HRDATA = strg;

endmodule