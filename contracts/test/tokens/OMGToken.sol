/* solium-disable */

pragma solidity ^0.4.11;


/**
 * Math operations with safety checks
 */
library OMG_SafeMath {
    function mul(uint a, uint b) internal returns (uint) {
        uint c = a * b;
        assert(a == 0 || c / a == b);
        return c;
    }

    function div(uint a, uint b) internal returns (uint) {
        // assert(b > 0); // Solidity automatically throws when dividing by 0
        uint c = a / b;
        // assert(a == b * c + a % b); // There is no case in which this doesn't hold
        return c;
    }

    function sub(uint a, uint b) internal returns (uint) {
        assert(b <= a);
        return a - b;
    }

    function add(uint a, uint b) internal returns (uint) {
        uint c = a + b;
        assert(c >= a);
        return c;
    }

    function max64(uint64 a, uint64 b) internal constant returns (uint64) {
        return a >= b ? a : b;
    }

    function min64(uint64 a, uint64 b) internal constant returns (uint64) {
        return a < b ? a : b;
    }

    function max256(uint256 a, uint256 b) internal constant returns (uint256) {
        return a >= b ? a : b;
    }

    function min256(uint256 a, uint256 b) internal constant returns (uint256) {
        return a < b ? a : b;
    }

    function assert(bool assertion) internal {
        if (!assertion) {
            revert("revert-0");
        }
    }
}


/**
 * @title OMG_ERC20Basic
 * @dev Simpler version of ERC20 interface
 * @dev see https://github.com/ethereum/EIPs/issues/20
 */
contract OMG_ERC20Basic {
    uint public totalSupply;
    function balanceOf(address who) public constant returns (uint);
    function transfer(address to, uint value) public;
    event Transfer(address indexed from, address indexed to, uint value);
}


/**
 * @title Basic token
 * @dev Basic version of OMG_StandardToken, with no allowances.
 */
contract OMG_BasicToken is OMG_ERC20Basic {
    using OMG_SafeMath for uint;

    mapping(address => uint) balances;

    /**
    * @dev Fix for the ERC20 short address attack.
    */
    modifier onlyPayloadSize(uint size) {
        if(msg.data.length < size + 4) {
            revert("1");
        }
        _;
    }

    /**
    * @dev transfer token for a specified address
    * @param _to The address to transfer to.
    * @param _value The amount to be transferred.
    */
    function transfer(address _to, uint _value) public onlyPayloadSize(2 * 32) {
        balances[msg.sender] = balances[msg.sender].sub(_value);
        balances[_to] = balances[_to].add(_value);
        Transfer(msg.sender, _to, _value);
    }

    /**
    * @dev Gets the balance of the specified address.
    * @param _owner The address to query the the balance of.
    * @return An uint representing the amount owned by the passed address.
    */
    function balanceOf(address _owner) public constant returns (uint balance) {
        return balances[_owner];
    }

}


/**
 * @title ERC20 interface
 * @dev see https://github.com/ethereum/EIPs/issues/20
 */
contract OMG_ERC20 is OMG_ERC20Basic {
    function allowance(address owner, address spender) public constant returns (uint);
    function transferFrom(address from, address to, uint value);
    function approve(address spender, uint value);
    event Approval(address indexed owner, address indexed spender, uint value);
}


/**
 * @title Standard ERC20 token
 *
 * @dev Implemantation of the basic standart token.
 * @dev https://github.com/ethereum/EIPs/issues/20
 * @dev Based on code by FirstBlood: https://github.com/Firstbloodio/token/blob/master/smart_contract/FirstBloodToken.sol
 */
contract OMG_StandardToken is OMG_BasicToken, OMG_ERC20 {

    mapping (address => mapping (address => uint)) allowed;


    /**
    * @dev Transfer tokens from one address to another
    * @param _from address The address which you want to send tokens from
    * @param _to address The address which you want to transfer to
    * @param _value uint the amout of tokens to be transfered
    */
    function transferFrom(address _from, address _to, uint _value) public onlyPayloadSize(3 * 32) {
        var _allowance = allowed[_from][msg.sender];

        // Check is not needed because sub(_allowance, _value) will already throw if this condition is not met
        // if (_value > _allowance) revert("2");

        balances[_to] = balances[_to].add(_value);
        balances[_from] = balances[_from].sub(_value);
        allowed[_from][msg.sender] = _allowance.sub(_value);
        Transfer(_from, _to, _value);
    }

    /**
    * @dev Aprove the passed address to spend the specified amount of tokens on beahlf of msg.sender.
    * @param _spender The address which will spend the funds.
    * @param _value The amount of tokens to be spent.
    */
    function approve(address _spender, uint _value) public {

        // To change the approve amount you first have to reduce the addresses`
        //  allowance to zero by calling `approve(_spender, 0)` if it is not
        //  already 0 to mitigate the race condition described here:
        //  https://github.com/ethereum/EIPs/issues/20#issuecomment-263524729
        if ((_value != 0) && (allowed[msg.sender][_spender] != 0)) revert("3");

        allowed[msg.sender][_spender] = _value;
        Approval(msg.sender, _spender, _value);
    }

    /**
    * @dev Function to check the amount of tokens than an owner allowed to a spender.
    * @param _owner address The address which owns the funds.
    * @param _spender address The address which will spend the funds.
    * @return A uint specifing the amount of tokens still avaible for the spender.
    */
    function allowance(address _owner, address _spender) public constant returns (uint remaining) {
        return allowed[_owner][_spender];
    }

}


/**
 * @title OMG_Ownable
 * @dev The OMG_Ownable contract has an owner address, and provides basic authorization control
 * functions, this simplifies the implementation of "user permissions".
 */
contract OMG_Ownable {
    address public owner;


    /**
    * @dev The OMG_Ownable constructor sets the original `owner` of the contract to the sender
    * account.
    */
    function OMG_Ownable() public {
        owner = msg.sender;
    }


    /**
    * @dev Throws if called by any account other than the owner.
    */
    modifier onlyOwner() {
        if (msg.sender != owner) {
        revert("4");
        }
        _;
    }


    /**
    * @dev Allows the current owner to transfer control of the contract to a newOwner.
    * @param newOwner The address to transfer ownership to.
    */
    function transferOwnership(address newOwner) public onlyOwner {
        if (newOwner != address(0)) {
        owner = newOwner;
        }
    }

}


/**
 * @title Mintable token
 * @dev Simple ERC20 Token example, with mintable token creation
 * @dev Issue: * https://github.com/OpenZeppelin/zeppelin-solidity/issues/120
 * Based on code by TokenMarketNet: https://github.com/TokenMarketNet/ico/blob/master/contracts/MintableToken.sol
 */

contract OMG_MintableToken is OMG_StandardToken, OMG_Ownable {
    event Mint(address indexed to, uint value);
    event MintFinished();

    bool public mintingFinished = false;
    uint public totalSupply = 0;


    modifier canMint() {
        if(mintingFinished) revert("5");
        _;
    }

    /**
    * @dev Function to mint tokens
    * @param _to The address that will recieve the minted tokens.
    * @param _amount The amount of tokens to mint.
    * @return A boolean that indicates if the operation was successful.
    */
    function mint(address _to, uint _amount) public onlyOwner canMint returns (bool) {
        totalSupply = totalSupply.add(_amount);
        balances[_to] = balances[_to].add(_amount);
        Mint(_to, _amount);
        return true;
    }

    /**
    * @dev Function to stop minting new tokens.
    * @return True if the operation was successful.
    */
    function finishMinting() public onlyOwner returns (bool) {
        mintingFinished = true;
        MintFinished();
        return true;
    }
}


/**
 * @title OMG_Pausable
 * @dev Base contract which allows children to implement an emergency stop mechanism.
 */
contract OMG_Pausable is OMG_Ownable {
    event Pause();
    event Unpause();

    bool public paused = false;


    /**
    * @dev modifier to allow actions only when the contract IS paused
    */
    modifier whenNotPaused() {
        if (paused) revert("6");
        _;
    }

    /**
    * @dev modifier to allow actions only when the contract IS NOT paused
    */
    modifier whenPaused {
        if (!paused) revert("7");
        _;
    }

    /**
    * @dev called by the owner to pause, triggers stopped state
    */
    function pause() public onlyOwner whenNotPaused returns (bool) {
        paused = true;
        Pause();
        return true;
    }

    /**
    * @dev called by the owner to unpause, returns to normal state
    */
    function unpause() public onlyOwner whenPaused returns (bool) {
        paused = false;
        Unpause();
        return true;
    }
}


/**
 * OMG_Pausable token
 *
 * Simple ERC20 Token example, with pausable token creation
 **/

contract OMG_PausableToken is OMG_StandardToken, OMG_Pausable {

    function transfer(address _to, uint _value) public whenNotPaused {
        super.transfer(_to, _value);
    }

    function transferFrom(address _from, address _to, uint _value) public whenNotPaused {
        super.transferFrom(_from, _to, _value);
    }
}


/**
 * @title OMG_TokenTimelock
 * @dev OMG_TokenTimelock is a token holder contract that will allow a
 * beneficiary to extract the tokens after a time has passed
 */
contract OMG_TokenTimelock {

    // ERC20 basic token contract being held
    OMG_ERC20Basic token;

    // beneficiary of tokens after they are released
    address beneficiary;

    // timestamp where token release is enabled
    uint releaseTime;

    function OMG_TokenTimelock(OMG_ERC20Basic _token, address _beneficiary, uint _releaseTime) public {
        require(_releaseTime > now);
        token = _token;
        beneficiary = _beneficiary;
        releaseTime = _releaseTime;
    }

    /**
    * @dev beneficiary claims tokens held by time lock
    */
    function claim() public {
        require(msg.sender == beneficiary);
        require(now >= releaseTime);

        uint amount = token.balanceOf(this);
        require(amount > 0);

        token.transfer(beneficiary, amount);
    }
}


/**
 * @title OMGToken
 * @dev Omise Go Token contract
 */
contract OMGToken is OMG_PausableToken, OMG_MintableToken {
    using OMG_SafeMath for uint256;

    string public name = "OMGToken";
    string public symbol = "OMG";
    uint public decimals = 18;

    /**
    * @dev mint timelocked tokens
    */
    function mintTimelocked(address _to, uint256 _amount, uint256 _releaseTime)
        public onlyOwner canMint returns (OMG_TokenTimelock) {

        OMG_TokenTimelock timelock = new OMG_TokenTimelock(this, _to, _releaseTime);
        mint(timelock, _amount);

        return timelock;
    }

}