
module regFile( //parameterize
    input clk, rst,
    input rfwr,	
    input [4:0] rfrd, rfrs1, rfrs2,
    input [31:0] rfD,
    output reg [31:0] rfRS1, rfRS2

	,input simdone
);


    reg[31:0] RF[31:0]
	/* synthesis syn_ramstyle = "block_ram" */ ;

    //assign rfRS1 = RF[rfrs1];
	//assign rfRS2 = RF[rfrs2];

	always @(negedge clk)
			rfRS1 = RF[rfrs1];

	always @(negedge clk)
			rfRS2 = RF[rfrs2];

	integer i;
	always @(posedge clk or posedge rst)
        if(rst) begin
			for(i=0; i<32; i=i+1)
				RF[i] <= 0;
		end
		else begin 
            if(rfwr) begin
                RF[rfrd] <= rfD;
            end
        end
    
endmodule
