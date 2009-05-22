/*
	TeaTimer: A Firefox extension that protects you from oversteeped tea.
	Copyright (C) 2009 Philipp Söhnlein

	This program is free software: you can redistribute it and/or modify
	it under the terms of the GNU General Public License version 3 as 
	published by the Free Software Foundation.

	This program is distributed in the hope that it will be useful,
	but WITHOUT ANY WARRANTY; without even the implied warranty of
	MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
	GNU General Public License for more details.

	You should have received a copy of the GNU General Public License
	along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/
function jsTwitter(user,pw)
{
	var useHttps=true;
	var username=(typeof user==="string" && user.length>0)?user:null;
	var password=(typeof pw==="string" && pw.length>0)?pw:null;
	
	var socket=new XMLHttpRequest();

	/**
	 * Use this public method to ask the Twitter server if credentials are ok.
	 * @throws twitterNetworkErrorException
	 * return bool
	 **/
	this.verifyCredentials=function()
	{
		checkCredentials();
		try
		{
			socket.mozBackgroundRequest=true; //if credentials are wrong, FF show a HTTP Auth dialog. We don't want that, so we set mozBackgroundRequest to true; works only if FF>=3
			socket.open("GET",getHostAndProtocol()+"account/verify_credentials.xml",false);
			socket.setRequestHeader("Authorization","Basic "+Base64.encode(username+":"+password));
			socket.send(null);
		}
		catch(e)
		{
			throw new twitterNetworkErrorException("Network error while verifying credentials.");
		}
		
		var credentialResult=false;
		//alert(socket.responseText);
		try
		{
			checkResponse();
			if(
				socket.responseXML.getElementsByTagName("user").length && socket.responseXML.getElementsByTagName("user").length>0 &&
				socket.responseXML.getElementsByTagName("id").length && socket.responseXML.getElementsByTagName("id").length>0
			)
			{
				credentialResult=true;
			}
		}
		catch(ex)
		{
			if(!(ex.name && ex.name==="twitterHttpNotAuthorizedException"))
			{
				throw ex;
			}
			
		}
		
		return credentialResult;
	}
	
	/**
	 * Use this method to send a tweet with the given text.
	 * @param string text2tweet
	 * @throws twitterInvalidTextException
	 * @throws twitterNetworkErrorException
	 * @throws twitterBadResponseException
	 **/
	this.sendTweet=function(text2tweet)
	{
		if(!(typeof text2tweet==="string" && text2tweet.length>0))
		{
			throw new twitterInvalidTextException("sendTweet: First argument (text2tweet) must be a string with more than 0 chars.");
		}
		
		checkCredentials();
		try
		{
			socket.mozBackgroundRequest=false; //if credentials are wrong, FF shows a HTTP Auth dialog. We already checked credentials, so we don't have to hide the HTTP auth dialog (would be "true").
			socket.open("POST",getHostAndProtocol()+"statuses/update.xml",false);
			socket.setRequestHeader("Authorization","Basic "+Base64.encode(username+":"+password));
			socket.setRequestHeader("Content-Type","application/x-www-form-urlencoded");
			socket.send("status="+text2tweet.replace("&",escape("&")));
		}
		catch(e)
		{
			throw new twitterNetworkErrorException("Network error while sending tweet.");
		}
		
		checkResponse();
		
		if(!
			(
				socket.responseXML.getElementsByTagName("status").length && socket.responseXML.getElementsByTagName("status").length>0 &&
				socket.responseXML.getElementsByTagName("id").length && socket.responseXML.getElementsByTagName("id").length>0
			)
		)
		{
			throw new twitterBadResponseException("Send Tweet: Got a response from twitter, but it didn't contain a status or id tag.");
		}
	}
	
	/**
	 * This private method checks, if the class knows the credentials.
	 * No server communication happens here
	 *
	 * @throws twitterInvalidUsernameException
	 * @throws twitterInvalidPasswordException
	 * @returns true, if everything is okay.
	 **/
	var checkCredentials=function()
	{
		if(!(typeof username==="string" && username.length>0))
		{
			throw new twitterInvalidUsernameException("checkCredentials: No valid username set (must be string with more than 0 chars).");
		}
		
		if(!(typeof password==="string" && password.length>0))
		{
			throw new twitterInvalidPasswordException("checkCredentials: No valid password set (must be string with more than 0 chars).");
		}
		
		return true;
	}
	
	/**
	 * This internal method checks, if the server response was okay (ready state and HTTP status code).
	 *
	 * @throws twitterHttpBadRequestException
	 * @throws twitterHttpNotAuthorizedException
	 * @throws twitterHttpForbiddenException
	 * @throws twitterHttpNotFoundException
	 * @throws twitterHttpInternalServerErrorException
	 * @throws twitterHttpBadGatewayException
	 * @throws twitterHttpServiceUnavailableException
	 * @throws twitterHttpException
	 * returns bool
	 **/
	var checkResponse=function()
	{
		var ok=false;
		if(socket.readyState===4)
		{
			if(socket.status===200)
			{
				ok=true;
			}
			else
			{
				switch(socket.status)
				{
					case 400:
						throw new twitterHttpBadRequestException("Request wasn't understood by Twitter or you exceeded your rate limit.");
						break;
					case 401:
						throw new twitterHttpNotAuthorizedException("Either you need to provide authentication credentials, or the credentials provided aren't valid.");
						break;
					case 403:
						throw new twitterHttpForbiddenException("Twitter understands your request, but is refusing to fulfill it.");
						break;
					case 404:
						throw new twitterHttpNotFoundException("Either you're requesting an invalid URI or the resource in question doesn't exist (ex: no such user).");
						break;
					case 500:
						throw new twitterHttpInternalServerErrorException("There's an unspecified problem with your request at Twitter.");
						break;
					case 502:
						throw new twitterHttpBadGatewayException("Twitter seems to be down (Fail Whale alert).");
						break;
					case 503:
						throw new twitterHttpServiceUnavailableException("Twitter seems to be overloaded.");
						break;
					default:
						throw new twitterHttpException("An unknown error occurred during HTTP connection to Twitter-API. HTTP status code was "+socket.status);
						break;
				}
			}
		}
		
		return ok;
	}
	
	/**
	 * This internal function returns the first part of the Twitter API URL, including protocol (http OR https), hostname, TLD and trailing slash.
	 * @returns string (example: https://twitter.com/)
	 **/
	var getHostAndProtocol=function()
	{
		return "http"+((useHttps)?"s":"")+"://twitter.com/";
	}
}

function twitterInvalidUsernameException(msg)
{
	this.name="twitterInvalidUsernameException";
	this.message=((msg===undefined)?null:msg);
}

function twitterInvalidPasswordException(msg)
{
	this.name="twitterInvalidPasswordException";
	this.message=((msg===undefined)?null:msg);
}

function twitterInvalidTextException(msg)
{
	this.name="twitterInvalidTextException";
	this.message=((msg===undefined)?null:msg);
}

function twitterBadResponseException(msg)
{
	this.name="twitterBadResponseException";
	this.message=((msg===undefined)?null:msg);
}

function twitterNetworkErrorException(msg)
{
	this.name="twitterNetworkErrorException";
	this.message=((msg===undefined)?null:msg);
}

function twitterHttpException(msg)
{
	this.name="twitterHttpException";
	this.message=((msg===undefined)?null:msg);
}

function twitterHttpBadRequestException(msg) //status code 400; see http://apiwiki.twitter.com/REST+API+Documentation#HTTPStatusCodes
{
	this.name="twitterHttpBadRequestException";
	this.message=((msg===undefined)?null:msg);
}

function twitterHttpNotAuthorizedException(msg) //status code 401; see http://apiwiki.twitter.com/REST+API+Documentation#HTTPStatusCodes
{
	this.name="twitterHttpNotAuthorizedException";
	this.message=((msg===undefined)?null:msg);
}

function twitterHttpForbiddenException(msg) //status code 403; see http://apiwiki.twitter.com/REST+API+Documentation#HTTPStatusCodes
{
	this.name="twitterHttpForbiddenException";
	this.message=((msg===undefined)?null:msg);
}

function twitterHttpNotFoundException(msg) //status code 404; see http://apiwiki.twitter.com/REST+API+Documentation#HTTPStatusCodes
{
	this.name="twitterHttpNotFoundException";
	this.message=((msg===undefined)?null:msg);
}

function twitterHttpInternalServerErrorException(msg) //status code 500; see http://apiwiki.twitter.com/REST+API+Documentation#HTTPStatusCodes
{
	this.name="twitterHttpInternalServerErrorException";
	this.message=((msg===undefined)?null:msg);
}

function twitterHttpBadGatewayException(msg) //status code 502; see http://apiwiki.twitter.com/REST+API+Documentation#HTTPStatusCodes
{
	this.name="twitterHttpBadGatewayException";
	this.message=((msg===undefined)?null:msg);
}

function twitterHttpServiceUnavailableException(msg) //status code 503; see http://apiwiki.twitter.com/REST+API+Documentation#HTTPStatusCodes
{
	this.name="twitterHttpServiceUnavailableException";
	this.message=((msg===undefined)?null:msg);
}